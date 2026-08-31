"use strict";

const ExcelJS = require("exceljs");
const { ApiError } = require("@erp/shared");

const CustomerRepository = require("../repositories/customer.repository");
const RelationRepository = require("../repositories/relation.repository");
const MasterClient = require("../clients/master.client");
const compliance = require("../utils/compliance");
const { CUSTOMER_STATUS } = require("../constants");

class CustomerImportExportService {
  static normalizeCustomerType(value) {
    const type = String(value || "BUSINESS")
      .trim()
      .toUpperCase();

    const allowed = ["BUSINESS", "INDIVIDUAL", "GOVERNMENT"];

    if (!allowed.includes(type)) {
      throw new Error(
        `Invalid Customer Type "${type}". Allowed values: ${allowed.join(", ")}`,
      );
    }

    return type;
  }

  static normalizeTaxTreatment(value) {
    const treatment = String(value || "REGISTERED")
      .trim()
      .toUpperCase();

    const allowed = ["REGISTERED", "COMPOSITION", "UNREGISTERED"];

    if (!allowed.includes(treatment)) {
      throw new Error(
        `Invalid Tax Treatment "${treatment}". Allowed values: ${allowed.join(", ")}`,
      );
    }

    return treatment;
  }

  static getPrismaUniqueError(error, field) {
    if (error?.code !== "P2002") {
      return false;
    }

    const target = Array.isArray(error.meta?.target)
      ? error.meta.target
      : [error.meta?.target];

    return target.some((item) =>
      String(item).toLowerCase().includes(field.toLowerCase()),
    );
  }
  /**
   * Export customers to Excel.
   *
   * @param {Object} query
   * @returns {Buffer}
   */

  static async exportCustomers(query = {}) {
    const where = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.segment ? { segment: query.segment } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search } },
              { legalName: { contains: query.search } },
              { email: { contains: query.search } },
              { gstin: { contains: query.search } },
            ],
          }
        : {}),
    };

    const customers = await CustomerRepository.findMany({
      where,
      orderBy: { createdAt: "desc" },
      detailed: true,
    });

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "ERP";
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet("Customers");

    const columns = [
      { header: "Customer Code", key: "code", width: 18 },
      { header: "Legal Name", key: "legalName", width: 30 },
      { header: "Trade Name", key: "tradeName", width: 30 },
      { header: "Customer Type", key: "type", width: 18 },
      { header: "Status", key: "status", width: 18 },
      { header: "GSTIN", key: "gstin", width: 20 },
      { header: "PAN", key: "pan", width: 16 },
      { header: "Tax Treatment", key: "taxTreatment", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone", key: "phone", width: 18 },
      { header: "Website", key: "website", width: 30 },
      { header: "Currency", key: "currencyCode", width: 12 },
      { header: "Payment Term Days", key: "paymentTermDays", width: 20 },
      { header: "Credit Limit", key: "creditLimit", width: 18 },
      { header: "Credit Used", key: "creditUsed", width: 18 },
      { header: "Industry", key: "industry", width: 22 },
      { header: "Segment", key: "segment", width: 16 },
      { header: "Owner ID", key: "ownerId", width: 15 },
      { header: "Lead ID", key: "leadId", width: 15 },
      { header: "Notes", key: "notes", width: 40 },
      { header: "Created At", key: "createdAt", width: 22 },
      { header: "Updated At", key: "updatedAt", width: 22 },
    ];

    worksheet.columns = columns;

    worksheet.getRow(1).font = {
      bold: true,
    };

    worksheet.getRow(1).alignment = {
      vertical: "middle",
    };

    worksheet.freezePanes = {
      ySplit: 1,
    };

    for (const customer of customers) {
      worksheet.addRow({
        code: customer.code,
        legalName: customer.legalName,
        tradeName: customer.tradeName || "",
        type: customer.type,
        status: customer.status,
        gstin: customer.gstin || "",
        pan: customer.pan || "",
        taxTreatment: customer.taxTreatment || "",
        email: customer.email || "",
        phone: customer.phone || "",
        website: customer.website || "",
        currencyCode: customer.currencyCode || "",
        paymentTermDays: customer.paymentTermDays ?? "",
        creditLimit:
          customer.creditLimit !== null && customer.creditLimit !== undefined
            ? String(customer.creditLimit)
            : "",
        creditUsed:
          customer.creditUsed !== null && customer.creditUsed !== undefined
            ? String(customer.creditUsed)
            : "",
        industry: customer.industry || "",
        segment: customer.segment || "",
        ownerId: customer.ownerId || "",
        leadId: customer.leadId || "",
        notes: customer.notes || "",
        createdAt: customer.createdAt || "",
        updatedAt: customer.updatedAt || "",
      });
    }

    // Keep GSTIN/PAN/phone/customer code as text.
    ["A", "F", "G", "J"].forEach((column) => {
      worksheet.getColumn(column).eachCell((cell) => {
        cell.numFmt = "@";
      });
    });

    // Auto filter
    worksheet.autoFilter = {
      from: "A1",
      to: `${String.fromCharCode(64 + columns.length)}1`,
    };

    return workbook.xlsx.writeBuffer();
  }

  /**
   * Generate blank import template.
   */
  static async exportTemplate() {
    const workbook = new ExcelJS.Workbook();

    workbook.creator = "ERP";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Customers");

    worksheet.columns = [
      { header: "Customer Code", key: "code", width: 18 },
      { header: "Legal Name", key: "legalName", width: 30 },
      { header: "Trade Name", key: "tradeName", width: 30 },
      { header: "Customer Type", key: "type", width: 18 },
      { header: "GSTIN", key: "gstin", width: 20 },
      { header: "PAN", key: "pan", width: 16 },
      { header: "Tax Treatment", key: "taxTreatment", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone", key: "phone", width: 18 },
      { header: "Website", key: "website", width: 30 },
      { header: "Currency", key: "currencyCode", width: 12 },
      { header: "Payment Term Days", key: "paymentTermDays", width: 20 },
      { header: "Credit Limit", key: "creditLimit", width: 18 },
      { header: "Industry", key: "industry", width: 22 },
      { header: "Segment", key: "segment", width: 16 },
      { header: "Owner ID", key: "ownerId", width: 15 },
      { header: "Lead ID", key: "leadId", width: 15 },
      { header: "Notes", key: "notes", width: 40 },
    ];

    worksheet.getRow(1).font = {
      bold: true,
    };

    worksheet.freezePanes = {
      ySplit: 1,
    };

    worksheet.getRow(2).values = [
      "CUST-0001",
      "ABC Electronics Pvt Ltd",
      "ABC Electronics",
      "BUSINESS",
      "06ABCDE1234F1Z5",
      "ABCDE1234F",
      "REGISTERED",
      "accounts@example.com",
      "9876543210",
      "https://example.com",
      "INR",
      30,
      100000,
      "Electronics",
      "SMB",
      "",
      "",
      "Sample customer",
    ];

    return workbook.xlsx.writeBuffer();
  }

  /**
   * Import customers from Excel.
   *
   * mode:
   *  - create: only create new customers
   *  - upsert: update customer by code if already exists
   */
static async importCustomers(buffer, user, options = {}) {
  if (!buffer) {
    throw ApiError.validation("Excel file is required");
  }

  const mode = options.mode || "create";

  if (!["create", "upsert"].includes(mode)) {
    throw ApiError.validation("Invalid import mode");
  }

  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(buffer);
  } catch (error) {
    throw ApiError.validation("Invalid Excel file");
  }

  const worksheet =
    workbook.getWorksheet("Customers") || workbook.worksheets[0];

  if (!worksheet) {
    throw ApiError.validation("Customers worksheet not found");
  }

  if (worksheet.rowCount < 2) {
    throw ApiError.validation("Excel file contains no customer records");
  }

  /**
   * ---------------------------------------------------------
   * Headers
   * ---------------------------------------------------------
   */
  const headers = {};

  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    const value = String(cell.value || "")
      .trim()
      .toLowerCase();

    if (value) {
      headers[value] = columnNumber;
    }
  });

  const requiredHeaders = ["legal name"];

  for (const header of requiredHeaders) {
    if (!headers[header]) {
      throw ApiError.validation(
        `Required column "${header}" is missing`,
      );
    }
  }

  /**
   * ---------------------------------------------------------
   * Excel cell value helper
   * ---------------------------------------------------------
   */
  const getValue = (row, name) => {
    const column = headers[name.toLowerCase()];

    if (!column) {
      return null;
    }

    const cell = row.getCell(column);

    if (
      cell.value === null ||
      cell.value === undefined
    ) {
      return null;
    }

    /**
     * ExcelJS can return objects for:
     * hyperlinks, rich text, formulas etc.
     */
    if (
      typeof cell.value === "object" &&
      cell.value.text
    ) {
      return String(cell.value.text).trim();
    }

    if (
      typeof cell.value === "object" &&
      cell.value.result !== undefined
    ) {
      return String(cell.value.result).trim();
    }

    return String(cell.value).trim();
  };

  /**
   * ---------------------------------------------------------
   * Result
   * ---------------------------------------------------------
   */
  const results = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  /**
   * Track duplicates inside current Excel file.
   */
  const processedCodes = new Set();
  const processedGstins = new Set();

  /**
   * ---------------------------------------------------------
   * Process rows
   * ---------------------------------------------------------
   */
  for (
    let rowNumber = 2;
    rowNumber <= worksheet.rowCount;
    rowNumber++
  ) {
    const row = worksheet.getRow(rowNumber);

    /**
     * Skip completely empty rows.
     */
    const hasData = row.values
      .slice(1)
      .some(
        (value) =>
          value !== null &&
          value !== undefined &&
          String(value).trim() !== "",
      );

    if (!hasData) {
      continue;
    }

    results.total++;

    try {
      /**
       * -----------------------------------------------------
       * Basic fields
       * -----------------------------------------------------
       */
      const legalName = getValue(
        row,
        "Legal Name",
      );

      if (!legalName) {
        throw new Error(
          "Legal Name is required",
        );
      }

      let code = getValue(
        row,
        "Customer Code",
      );

      const gstin = getValue(
        row,
        "GSTIN",
      );

      const pan = getValue(
        row,
        "PAN",
      );

      /**
       * -----------------------------------------------------
       * Normalize GSTIN / PAN
       * -----------------------------------------------------
       */
      const normalizedGstin = gstin
        ? gstin.trim().toUpperCase()
        : null;

      const normalizedPan = pan
        ? pan.trim().toUpperCase()
        : null;

      /**
       * -----------------------------------------------------
       * Duplicate GSTIN inside Excel
       * -----------------------------------------------------
       */
      if (
        normalizedGstin &&
        processedGstins.has(normalizedGstin)
      ) {
        throw new Error(
          `Duplicate GSTIN in import file: ${normalizedGstin}`,
        );
      }

      if (normalizedGstin) {
        processedGstins.add(
          normalizedGstin,
        );
      }

      /**
       * -----------------------------------------------------
       * Compliance validation
       * -----------------------------------------------------
       */
      this.assertCompliance({
        gstin: normalizedGstin,
        pan: normalizedPan,
      });

      /**
       * -----------------------------------------------------
       * Find existing customer
       *
       * IMPORTANT:
       * Including deleted customers is required because
       * customer.code is globally UNIQUE in MySQL.
       * -----------------------------------------------------
       */
      let existing = null;

      if (code) {
        code = code
          .trim()
          .toUpperCase();

        /**
         * Duplicate code inside Excel
         */
        if (processedCodes.has(code)) {
          throw new Error(
            `Duplicate customer code in import file: ${code}`,
          );
        }

        processedCodes.add(code);

        existing =
          await CustomerRepository.findByCodeIncludingDeleted(
            code,
          );
      }

      /**
       * If code didn't find customer, try GSTIN.
       *
       * This must also include soft-deleted customers.
       */
      if (
        !existing &&
        normalizedGstin
      ) {
        existing =
          await CustomerRepository.findByGstinIncludingDeleted(
            normalizedGstin,
          );
      }

      /**
       * -----------------------------------------------------
       * Normalize enum values
       * -----------------------------------------------------
       */
      const customerType =
        this.normalizeCustomerType(
          getValue(
            row,
            "Customer Type",
          ),
        );

      const taxTreatment =
        this.normalizeTaxTreatment(
          getValue(
            row,
            "Tax Treatment",
          ),
        );

      /**
       * -----------------------------------------------------
       * Segment
       * -----------------------------------------------------
       */
      const segment =
        (
          getValue(
            row,
            "Segment",
          ) || "SMB"
        )
          .trim()
          .toUpperCase();

      /**
       * -----------------------------------------------------
       * Currency
       * -----------------------------------------------------
       */
      const currencyCode =
        (
          getValue(
            row,
            "Currency",
          ) || "INR"
        )
          .trim()
          .toUpperCase();

      /**
       * -----------------------------------------------------
       * Owner / Lead
       * -----------------------------------------------------
       */
      const ownerId =
        getValue(
          row,
          "Owner ID",
        ) || user.id;

      const leadId =
        getValue(
          row,
          "Lead ID",
        );

      /**
       * -----------------------------------------------------
       * Numeric fields
       * -----------------------------------------------------
       */
      const paymentTermDays =
        this.numberOrDefault(
          getValue(
            row,
            "Payment Term Days",
          ),
          30,
        );

      const creditLimit =
        this.numberOrDefault(
          getValue(
            row,
            "Credit Limit",
          ),
          0,
        );

      /**
       * -----------------------------------------------------
       * Payload
       * -----------------------------------------------------
       */
      const payload = {
        legalName:
          legalName.trim(),

        tradeName:
          getValue(
            row,
            "Trade Name",
          ),

        type:
          customerType,

        gstin:
          normalizedGstin,

        pan:
          normalizedPan,

        taxTreatment:
          taxTreatment,

        email:
          getValue(
            row,
            "Email",
          ),

        phone:
          getValue(
            row,
            "Phone",
          ),

        website:
          getValue(
            row,
            "Website",
          ),

        currencyCode:
          currencyCode,

        paymentTermDays:
          paymentTermDays,

        creditLimit:
          creditLimit,

        industry:
          getValue(
            row,
            "Industry",
          ),

        segment:
          segment,

        ownerId:
          ownerId,

        leadId:
          leadId,

        notes:
          getValue(
            row,
            "Notes",
          ),
      };

      /**
       * -----------------------------------------------------
       * EXISTING CUSTOMER
       * -----------------------------------------------------
       */
      if (existing) {
        /**
         * -----------------------------------------------
         * Soft-deleted customer
         *
         * Restore + update Excel data.
         *
         * Do NOT simply restore and continue.
         * Otherwise imported values won't be applied.
         * -----------------------------------------------
         */
        if (existing.deletedAt) {
          const updateData = {
            ...payload,
            deletedAt: null,
          };

          /**
           * Never modify these from Excel.
           */
          delete updateData.code;
          delete updateData.status;
          delete updateData.creditUsed;

          await CustomerRepository.restore(
            existing.id,
            user.id,
          );

          await CustomerRepository.update(
            existing.id,
            updateData,
            user.id,
          );

          /**
           * Credit log for restored customer
           */
          if (
            Number(creditLimit) > 0
          ) {
            await RelationRepository.createCreditLog({
              customerId:
                existing.id,

              type:
                "LIMIT_SET",

              amount:
                creditLimit,

              balanceAfter:
                creditLimit,

              notes:
                "Credit limit imported while restoring customer",

              actorId:
                user.id,
            });
          }

          results.updated++;

          continue;
        }

        /**
         * -----------------------------------------------
         * Existing active customer
         * -----------------------------------------------
         */
        if (mode === "create") {
          throw new Error(
            `Customer already exists: ${existing.code}`,
          );
        }

        /**
         * -----------------------------------------------
         * UPSERT existing active customer
         * -----------------------------------------------
         */
        if (mode === "upsert") {
          const updateData = {
            ...payload,
          };

          /**
           * Never import these fields.
           */
          delete updateData.code;
          delete updateData.status;
          delete updateData.creditUsed;

          await CustomerRepository.update(
            existing.id,
            updateData,
            user.id,
          );

          results.updated++;

          continue;
        }
      }

      /**
       * -----------------------------------------------------
       * NEW CUSTOMER
       * -----------------------------------------------------
       */

      /**
       * Generate customer code if Excel doesn't contain one.
       *
       * We check including deleted records because `code`
       * is globally unique in MySQL.
       */
      if (!code) {
        let generatedCode = null;

        /**
         * Prevent infinite loop.
         */
        for (
          let attempt = 0;
          attempt < 10;
          attempt++
        ) {
          const nextCode =
            await MasterClient.nextCustomerCode(
              user,
            );

          if (!nextCode) {
            continue;
          }

          const normalizedCode =
            String(nextCode)
              .trim()
              .toUpperCase();

          const codeExists =
            await CustomerRepository.findByCodeIncludingDeleted(
              normalizedCode,
            );

          if (!codeExists) {
            generatedCode =
              normalizedCode;

            break;
          }
        }

        if (!generatedCode) {
          throw new Error(
            "Unable to generate a unique customer code",
          );
        }

        code = generatedCode;
      } else {
        code = code
          .trim()
          .toUpperCase();
      }

      /**
       * -----------------------------------------------------
       * Final duplicate code check
       * -----------------------------------------------------
       */
      const duplicateCode =
        await CustomerRepository.findByCodeIncludingDeleted(
          code,
        );

      if (duplicateCode) {
        throw new Error(
          `Customer code already exists: ${code}`,
        );
      }

      /**
       * -----------------------------------------------------
       * Final duplicate GSTIN check
       * -----------------------------------------------------
       */
      if (normalizedGstin) {
        const duplicateGstin =
          await CustomerRepository.findByGstinIncludingDeleted(
            normalizedGstin,
          );

        if (duplicateGstin) {
          throw new Error(
            `GSTIN already exists: ${normalizedGstin}`,
          );
        }
      }

      /**
       * -----------------------------------------------------
       * Create customer
       * -----------------------------------------------------
       */
      let customer;

      try {
        customer =
          await CustomerRepository.create(
            {
              code,

              legalName:
                payload.legalName,

              tradeName:
                payload.tradeName ||
                null,

              type:
                payload.type,

              status:
                CUSTOMER_STATUS.ACTIVE,

              gstin:
                payload.gstin,

              pan:
                payload.pan,

              taxTreatment:
                payload.taxTreatment,

              email:
                payload.email ||
                null,

              phone:
                payload.phone ||
                null,

              website:
                payload.website ||
                null,

              currencyCode:
                payload.currencyCode,

              paymentTermDays:
                payload.paymentTermDays,

              creditLimit:
                payload.creditLimit,

              creditUsed:
                0,

              industry:
                payload.industry ||
                null,

              segment:
                payload.segment,

              ownerId:
                payload.ownerId ||
                user.id,

              leadId:
                payload.leadId ||
                null,

              notes:
                payload.notes ||
                null,
            },
            user.id,
          );
      } catch (error) {
        /**
         * ---------------------------------------------------
         * Prisma unique constraint handling
         *
         * Handles race conditions where another request
         * creates same code/GSTIN between our check and
         * create().
         * ---------------------------------------------------
         */
        if (
          this.getPrismaUniqueError(
            error,
            "code",
          )
        ) {
          throw new Error(
            `Customer code already exists: ${code}`,
          );
        }

        if (
          this.getPrismaUniqueError(
            error,
            "gstin",
          )
        ) {
          throw new Error(
            `GSTIN already exists: ${normalizedGstin}`,
          );
        }

        throw error;
      }

      /**
       * -----------------------------------------------------
       * Credit log
       * -----------------------------------------------------
       */
      if (
        Number(payload.creditLimit) > 0
      ) {
        await RelationRepository.createCreditLog({
          customerId:
            customer.id,

          type:
            "LIMIT_SET",

          amount:
            payload.creditLimit,

          balanceAfter:
            payload.creditLimit,

          notes:
            "Initial credit limit imported",

          actorId:
            user.id,
        });
      }

      results.created++;
    } catch (error) {
      /**
       * -----------------------------------------------------
       * Row error
       * -----------------------------------------------------
       */
      results.failed++;

      results.errors.push({
        row: rowNumber,
        message:
          error.message ||
          "Unable to import customer",
      });
    }
  }

  return results;
}
  static numberOrDefault(value, defaultValue = 0) {
    if (value === null || value === undefined || value === "") {
      return defaultValue;
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
      throw new Error(`Invalid numeric value: ${value}`);
    }

    return number;
  }

  static assertCompliance(payload) {
    const errors = [];

    const gstin = compliance.validateGstin(payload.gstin);

    if (!gstin.valid) {
      errors.push({
        field: "gstin",
        message: gstin.reason,
      });
    }

    const pan = compliance.validatePan(payload.pan);

    if (!pan.valid) {
      errors.push({
        field: "pan",
        message: pan.reason,
      });
    }

    if (
      gstin.valid &&
      !gstin.skipped &&
      pan.valid &&
      !pan.skipped &&
      gstin.pan !== pan.normalized
    ) {
      errors.push({
        field: "pan",
        message: "PAN does not match the PAN embedded in the GSTIN",
      });
    }

    if (errors.length) {
      throw new Error(errors.map((e) => `${e.field}: ${e.message}`).join("; "));
    }
  }
}

module.exports = CustomerImportExportService;
