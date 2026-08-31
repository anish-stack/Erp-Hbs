"use strict";

const {
  createProxyMiddleware,
  fixRequestBody,
} = require("http-proxy-middleware");

const {
  logger,
  ApiError,
  constants,
} = require("@erp/shared");

const config = require("../config");
const { FORWARD_HEADERS } = require("../constants");
const { getBreaker } = require("../utils/circuitBreaker");

/**
 * Check whether request body is multipart.
 *
 * Multipart requests MUST remain untouched because multer
 * in the downstream service needs the original stream.
 */
function isMultipartRequest(req) {
  return Boolean(req.is("multipart/form-data"));
}

/**
 * Builds proxy for one downstream service.
 */
function createServiceProxy(service) {
  const breaker = getBreaker(service.key);

  const proxy = createProxyMiddleware({
    target: service.url,

    changeOrigin: true,

    xfwd: true,

    proxyTimeout: config.proxyTimeoutMs,

    timeout: config.proxyTimeoutMs,

    logger: {
      info: () => {},

      warn: (msg) => {
        logger.warn(
          `[proxy:${service.key}] ${msg}`,
        );
      },

      error: (msg) => {
        logger.error(
          `[proxy:${service.key}] ${msg}`,
        );
      },
    },

    /**
     * Rewrite gateway path to service path.
     */
    pathRewrite: (path) => {
      const [pathname, query] = path.split("?");

      const cleanPath =
        pathname === "/"
          ? ""
          : pathname.replace(/\/+$/, "");

      return (
        `${config.apiPrefix}` +
        `${service.prefix}` +
        `${cleanPath}` +
        `${query ? `?${query}` : ""}`
      );
    },

    on: {
      /**
       * Before proxy request is sent.
       */
      proxyReq(proxyReq, req) {
        try {
          // ===================================================
          // Remove client supplied identity headers
          // ===================================================

          for (const header of Object.values(
            FORWARD_HEADERS,
          )) {
            proxyReq.removeHeader(header);
          }

          // ===================================================
          // Gateway request ID
          // ===================================================

          if (req.id) {
            proxyReq.setHeader(
              FORWARD_HEADERS.REQUEST_ID,
              String(req.id),
            );
          }

          // ===================================================
          // Gateway identity
          // ===================================================

          proxyReq.setHeader(
            FORWARD_HEADERS.GATEWAY,
            config.serviceName,
          );

          // ===================================================
          // Verified JWT user
          // ===================================================

          if (req.user) {
            if (req.user.id) {
              proxyReq.setHeader(
                FORWARD_HEADERS.USER_ID,
                String(req.user.id),
              );
            }

            proxyReq.setHeader(
              FORWARD_HEADERS.USER_EMAIL,
              req.user.email || "",
            );

            proxyReq.setHeader(
              FORWARD_HEADERS.USER_ROLE,
              req.user.role || "",
            );

            proxyReq.setHeader(
              FORWARD_HEADERS.USER_ROLE_ID,
              req.user.roleId || "",
            );

            proxyReq.setHeader(
              FORWARD_HEADERS.USER_DEPARTMENT,
              req.user.departmentId || "",
            );

            proxyReq.setHeader(
              FORWARD_HEADERS.TOKEN_ID,
              req.user.jti || "",
            );

            proxyReq.setHeader(
              FORWARD_HEADERS.USER_PERMISSIONS,
              Buffer.from(
                JSON.stringify(
                  req.user.permissions || [],
                ),
              ).toString("base64"),
            );
          }

          // ===================================================
          // MULTIPART
          // ===================================================

          if (isMultipartRequest(req)) {
            /*
             * VERY IMPORTANT:
             *
             * Do absolutely NOTHING with the body.
             *
             * Do NOT:
             *
             * proxyReq.write()
             * proxyReq.end()
             * fixRequestBody()
             *
             * HPM will stream the original multipart request.
             */

            logger.debug?.(
              `[proxy:${service.key}] Multipart request - streaming original body`,
              {
                requestId: req.id,
                path: req.originalUrl,
              },
            );

            return;
          }

          // ===================================================
          // JSON / URL ENCODED
          // ===================================================

          /*
           * express.json() / express.urlencoded() has already
           * consumed the original request stream.
           *
           * HPM therefore needs fixRequestBody() to recreate
           * the body from req.body.
           *
           * IMPORTANT:
           *
           * We DO NOT call proxyReq.write()
           * We DO NOT call proxyReq.end()
           */
          if (
            req.body !== undefined &&
            (
              req.is("json") ||
              req.is("application/json") ||
              req.is(
                "application/x-www-form-urlencoded",
              )
            )
          ) {
            fixRequestBody(proxyReq, req);
          }

          /*
           * No manual proxyReq.end().
           *
           * HPM/node handles the request lifecycle.
           */
        } catch (error) {
          logger.error(
            `[proxy:${service.key}] proxyReq handler failed`,
            {
              requestId: req.id,
              method: req.method,
              path: req.originalUrl,
              error: error.message,
              stack: error.stack,
            },
          );

          /*
           * Destroy upstream request only.
           *
           * Do NOT send response here.
           * HPM error handler will handle it.
           */
          if (!proxyReq.destroyed) {
            proxyReq.destroy(error);
          }
        }
      },

      // =====================================================
      // Upstream response
      // =====================================================

      proxyRes(proxyRes, req) {
        const statusCode =
          proxyRes.statusCode || 500;

        if (statusCode >= 500) {
          breaker.onFailure();

          logger.error(
            `[proxy:${service.key}] Upstream returned ${statusCode}`,
            {
              requestId: req.id,
              method: req.method,
              path: req.originalUrl,
              status: statusCode,
            },
          );
        } else {
          breaker.onSuccess();
        }

        logger.info(
          "Proxied request",
          {
            requestId: req.id,
            service: service.key,
            method: req.method,
            path: req.originalUrl,
            status: statusCode,
          },
        );
      },

      // =====================================================
      // Proxy error
      // =====================================================

      error(err, req, res) {
        breaker.onFailure();

        const requestId =
          req.id || "unknown";

        const errorCode =
          err?.code || "PROXY_ERROR";

        const errorMessage =
          err?.message || "Unknown proxy error";

        const path =
          req.originalUrl ||
          req.url ||
          "/";

        const method =
          req.method ||
          "UNKNOWN";

        const isTimeout =
          errorCode === "ECONNRESET" ||
          errorCode === "ETIMEDOUT" ||
          errorCode === "ESOCKETTIMEDOUT";

        const isClientAbort =
          errorCode === "ECONNABORTED" ||
          errorCode ===
            "ERR_STREAM_PREMATURE_CLOSE";

        const isWriteAfterEnd =
          errorMessage === "write after end";

        logger.error(
          `Proxy error [${service.key}]: ${errorMessage}`,
          {
            requestId,
            service: service.key,
            serviceUrl: service.url,
            method,
            path,
            errorCode,
            isTimeout,
            isClientAbort,
            isWriteAfterEnd,
            stack: err?.stack,
          },
        );

        // ===================================================
        // Client already disconnected
        // ===================================================

        if (
          res.destroyed ||
          res.writableEnded
        ) {
          return;
        }

        // ===================================================
        // Headers already sent
        // ===================================================

        if (res.headersSent) {
          try {
            res.end();
          } catch {
            // Ignore response close errors.
          }

          return;
        }

        // ===================================================
        // Timeout
        // ===================================================

        if (isTimeout) {
          return res.status(504).json({
            success: false,
            code: "GATEWAY_TIMEOUT",
            message:
              `${service.name} timed out`,
            requestId,
            timestamp:
              new Date().toISOString(),
          });
        }

        // ===================================================
        // Client aborted
        // ===================================================

        if (isClientAbort) {
          return res.status(499).json({
            success: false,
            code: "CLIENT_CLOSED_REQUEST",
            message:
              "Client closed the request.",
            requestId,
            timestamp:
              new Date().toISOString(),
          });
        }

        // ===================================================
        // Proxy stream error
        // ===================================================

        if (isWriteAfterEnd) {
          return res.status(503).json({
            success: false,
            code: "PROXY_STREAM_ERROR",
            message:
              "The gateway could not forward the request to the service.",
            requestId,
            timestamp:
              new Date().toISOString(),
          });
        }

        // ===================================================
        // Generic service unavailable
        // ===================================================

        return res.status(503).json({
          success: false,
          code: "SERVICE_UNAVAILABLE",
          message:
            `${service.name} is unavailable`,
          requestId,
          timestamp:
            new Date().toISOString(),
        });
      },
    },
  });

  // =========================================================
  // Circuit breaker wrapper
  // =========================================================

  return function guardedProxy(req, res, next) {
    if (!breaker.canRequest()) {
      logger.warn(
        `[proxy:${service.key}] Circuit breaker is open`,
        {
          requestId: req.id,
          path: req.originalUrl,
        },
      );

      return next(
        ApiError.serviceUnavailable(
          `${service.name} is temporarily unavailable`,
          {
            circuit: breaker.snapshot(),
            hint:
              constants.MESSAGES.COMMON
                .SERVICE_UNAVAILABLE,
          },
        ),
      );
    }

    return proxy(req, res, next);
  };
}

module.exports = {
  createServiceProxy,
};