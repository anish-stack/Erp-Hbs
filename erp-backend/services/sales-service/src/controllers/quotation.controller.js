"use strict";
const { ApiResponse, ApiError, asyncHandler } = require("@erp/shared");
const QuotationService = require("../services/quotation.service");

class QuotationController {
  static list = asyncHandler(async (req, res) =>
    ApiResponse.paginated(
      res,
      await QuotationService.list(req.query),
      "Quotations fetched",
    ),
  );
  static get = asyncHandler(async (req, res) =>
    ApiResponse.ok(
      res,
      await QuotationService.getById(req.params.id),
      "Quotation fetched",
    ),
  );
  static create = asyncHandler(async (req, res) =>
    ApiResponse.created(
      res,
      await QuotationService.create(req.body, req.user),
      "Quotation created",
    ),
  );
  static update = asyncHandler(async (req, res) =>
    ApiResponse.ok(
      res,
      await QuotationService.update(req.params.id, req.body, req.user),
      "Quotation updated",
    ),
  );

  static send = asyncHandler(async (req, res) => {
    console.log("[send] 0: controller entered", Date.now());
    const result = await QuotationService.send(req.params.id, req.user);
    console.log("[send] 6: service returned, sending response", Date.now());
    return ApiResponse.ok(res, result, "Quotation sent");
  });

  static accept = asyncHandler(async (req, res) =>
    ApiResponse.ok(
      res,
      await QuotationService.accept(req.params.id, req.user),
      "Quotation accepted",
    ),
  );
  static reject = asyncHandler(async (req, res) =>
    ApiResponse.ok(
      res,
      await QuotationService.reject(req.params.id, req.user),
      "Quotation rejected",
    ),
  );
  static convert = asyncHandler(async (req, res) =>
    ApiResponse.created(
      res,
      await QuotationService.convert(req.params.id, req.body, req.user),
      "Quotation converted to order",
    ),
  );

  static viewPdf = asyncHandler(async (req, res) => {
    const buffer = await QuotationService.renderPdf(req.params.id);
    const mode = req.query.download === "true" ? "attachment" : "inline";

    res.status(200);
    res.set("Content-Type", "application/pdf");
    res.set(
      "Content-Disposition",
      `${mode}; filename="quotation-${req.params.id}.pdf"`,
    );
    res.end(buffer);
  });

  // Public, no-auth endpoint hit from the quotation email.
  static acceptPublic = asyncHandler(async (req, res) => {
    const systemUser = { id: "system-mailer" };

    try {
      const quotation = await QuotationService.accept(
        req.params.id,
        systemUser,
      );

      return res.status(200).type("html").send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>Quotation Accepted</title>
          </head>
          <body style="
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 60px 20px;
            background: #f8fafc;
          ">
            <div style="
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            ">
              <h2 style="color: #16a34a;">
                Quotation ${quotation.code} Accepted
              </h2>

              <p style="color: #475569; font-size: 16px;">
                Thank you. Our team will reach out shortly to proceed with
                the order.
              </p>
            </div>
          </body>
        </html>
      `);
    } catch (err) {
      return res
        .status(err instanceof ApiError ? err.statusCode || 400 : 500)
        .type("html").send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>Quotation Acceptance Failed</title>
          </head>
          <body style="
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 60px 20px;
            background: #f8fafc;
          ">
            <div style="
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            ">
              <h2 style="color: #b91c1c;">
                Could not accept quotation
              </h2>

              <p style="color: #475569; font-size: 16px;">
                ${err.message || "Something went wrong."}
              </p>
            </div>
          </body>
        </html>
      `);
    }
  });

  // Public, no-auth endpoint hit from the quotation email.
  static rejectPublic = asyncHandler(async (req, res) => {
    const systemUser = { id: "system-mailer" };

    try {
      const quotation = await QuotationService.reject(
        req.params.id,
        systemUser,
      );

      return res.status(200).type("html").send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>Quotation Rejected</title>
          </head>
          <body style="
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 60px 20px;
            background: #f8fafc;
          ">
            <div style="
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            ">
              <h2 style="color: #dc2626;">
                Quotation ${quotation.code} Rejected
              </h2>

              <p style="color: #475569; font-size: 16px;">
                We have recorded your response. Our team will review the
                quotation and contact you if required.
              </p>
            </div>
          </body>
        </html>
      `);
    } catch (err) {
      return res
        .status(err instanceof ApiError ? err.statusCode || 400 : 500)
        .type("html").send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>Quotation Rejection Failed</title>
          </head>
          <body style="
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 60px 20px;
            background: #f8fafc;
          ">
            <div style="
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            ">
              <h2 style="color: #b91c1c;">
                Could not reject quotation
              </h2>

              <p style="color: #475569; font-size: 16px;">
                ${err.message || "Something went wrong."}
              </p>
            </div>
          </body>
        </html>
      `);
    }
  });
}
module.exports = QuotationController;
