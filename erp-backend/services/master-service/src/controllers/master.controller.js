'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const ManufacturerService = require('../services/manufacturer.service');
const CategoryService = require('../services/category.service');
const LookupService = require('../services/lookup.service');

class MasterController {
  // -------------------- Manufacturers --------------------
  static listManufacturers = asyncHandler(async (req, res) => {
    const result = await ManufacturerService.list(req.query);
    return ApiResponse.paginated(res, result, 'Manufacturers fetched');
  });

  static manufacturerOptions = asyncHandler(async (req, res) => {
    const options = await ManufacturerService.options();
    return ApiResponse.ok(res, options, 'Manufacturer options fetched');
  });

  static getManufacturer = asyncHandler(async (req, res) => {
    const row = await ManufacturerService.getById(req.params.id);
    return ApiResponse.ok(res, row, 'Manufacturer fetched');
  });

  static createManufacturer = asyncHandler(async (req, res) => {
    console.log(req.body)
    const row = await ManufacturerService.create(req.body, req.user.id);
    return ApiResponse.created(res, row, 'Manufacturer created');
  });

  static updateManufacturer = asyncHandler(async (req, res) => {
    const row = await ManufacturerService.update(req.params.id, req.body, req.user.id);
    return ApiResponse.ok(res, row, 'Manufacturer updated');
  });

  static deleteManufacturer = asyncHandler(async (req, res) => {
    const result = await ManufacturerService.remove(req.params.id, req.user.id);
    return ApiResponse.ok(res, result, 'Manufacturer deleted');
  });

  // -------------------- Categories --------------------
  static categoryTree = asyncHandler(async (req, res) => {
    const tree = await CategoryService.tree();
    return ApiResponse.ok(res, tree, 'Category tree fetched');
  });

  static listCategories = asyncHandler(async (req, res) => {
    const result = await CategoryService.list(req.query);
    return ApiResponse.paginated(res, result, 'Categories fetched');
  });

  static getCategory = asyncHandler(async (req, res) => {
    const row = await CategoryService.getById(req.params.id);
    return ApiResponse.ok(res, row, 'Category fetched');
  });

  static createCategory = asyncHandler(async (req, res) => {
    const row = await CategoryService.create(req.body, req.user.id);
    return ApiResponse.created(res, row, 'Category created');
  });

  static updateCategory = asyncHandler(async (req, res) => {
    const row = await CategoryService.update(req.params.id, req.body, req.user.id);
    return ApiResponse.ok(res, row, 'Category updated');
  });

  static deleteCategory = asyncHandler(async (req, res) => {
    const result = await CategoryService.remove(req.params.id, req.user.id);
    return ApiResponse.ok(res, result, 'Category deleted');
  });

  // -------------------- UOM --------------------
  static listUoms = asyncHandler(async (req, res) => {
    const rows = await LookupService.uoms(req.query.includeInactive === true);
    return ApiResponse.ok(res, rows, 'Units of measure fetched');
  });

  static createUom = asyncHandler(async (req, res) => {
    const row = await LookupService.createUom(req.body);
    return ApiResponse.created(res, row, 'Unit of measure created');
  });

  static updateUom = asyncHandler(async (req, res) => {
    const row = await LookupService.updateUom(req.params.id, req.body);
    return ApiResponse.ok(res, row, 'Unit of measure updated');
  });

  static convertUom = asyncHandler(async (req, res) => {
    const result = await LookupService.convert(req.body);
    return ApiResponse.ok(res, result, 'Quantity converted');
  });

  // -------------------- Currencies --------------------
  static listCurrencies = asyncHandler(async (req, res) => {
    const rows = await LookupService.currencies(req.query.includeInactive === true);
    return ApiResponse.ok(res, rows, 'Currencies fetched');
  });

  static createCurrency = asyncHandler(async (req, res) => {
    const row = await LookupService.createCurrency(req.body);
    return ApiResponse.created(res, row, 'Currency created');
  });

  static updateCurrencyRate = asyncHandler(async (req, res) => {
    const row = await LookupService.updateRate(req.params.id, req.body.exchangeRate, req.user.id);
    return ApiResponse.ok(res, row, 'Exchange rate updated');
  });

  static convertCurrency = asyncHandler(async (req, res) => {
    const result = await LookupService.convertAmount(req.body);
    return ApiResponse.ok(res, result, 'Amount converted');
  });

  // -------------------- Tax --------------------
  static listTaxRates = asyncHandler(async (req, res) => {
    const rows = await LookupService.taxRates(req.query.includeInactive === true);
    return ApiResponse.ok(res, rows, 'Tax rates fetched');
  });

  static createTaxRate = asyncHandler(async (req, res) => {
    const row = await LookupService.createTaxRate(req.body);
    return ApiResponse.created(res, row, 'Tax rate created');
  });

  static taxForHsn = asyncHandler(async (req, res) => {
    const row = await LookupService.resolveTaxForHsn(req.params.hsnCode);
    return ApiResponse.ok(res, row, 'Tax rate resolved');
  });

  static computeTax = asyncHandler(async (req, res) => {
    const result = await LookupService.computeTax(req.body);
    return ApiResponse.ok(res, result, 'Tax computed');
  });
}

module.exports = MasterController;
