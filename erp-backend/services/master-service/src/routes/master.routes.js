'use strict';

const express = require('express');
const { middlewares, constants } = require('@erp/shared');
const MasterController = require('../controllers/master.controller');
const v = require('../validators/master.validator');

const { validate, authorize } = middlewares;
const P = constants.PERMISSIONS;

const manufacturers = express.Router();
manufacturers.get('/options', MasterController.manufacturerOptions);
manufacturers.get('/', authorize(P.manufacturer.VIEW), validate(v.manufacturerList, 'query'), MasterController.listManufacturers);
manufacturers.post('/', authorize(P.manufacturer.CREATE), validate(v.manufacturerCreate), MasterController.createManufacturer);
manufacturers.get('/:id', authorize(P.manufacturer.VIEW), validate(v.idParam, 'params'), MasterController.getManufacturer);
manufacturers.put('/:id', authorize(P.manufacturer.UPDATE), validate(v.idParam, 'params'), validate(v.manufacturerUpdate), MasterController.updateManufacturer);
manufacturers.delete('/:id', authorize(P.manufacturer.DELETE), validate(v.idParam, 'params'), MasterController.deleteManufacturer);

const categories = express.Router();
categories.get('/tree', MasterController.categoryTree);
categories.get('/', authorize(P.category.VIEW), validate(v.categoryList, 'query'), MasterController.listCategories);
categories.post('/', authorize(P.category.CREATE), validate(v.categoryCreate), MasterController.createCategory);
categories.get('/:id', authorize(P.category.VIEW), validate(v.idParam, 'params'), MasterController.getCategory);
categories.put('/:id', authorize(P.category.UPDATE), validate(v.idParam, 'params'), validate(v.categoryUpdate), MasterController.updateCategory);
categories.delete('/:id', authorize(P.category.DELETE), validate(v.idParam, 'params'), MasterController.deleteCategory);

const uoms = express.Router();
uoms.get('/', MasterController.listUoms);
uoms.post('/convert', validate(v.uomConvert), MasterController.convertUom);
uoms.post('/', authorize(P.setting.CREATE), validate(v.uomCreate), MasterController.createUom);
uoms.put('/:id', authorize(P.setting.UPDATE), validate(v.idParam, 'params'), validate(v.uomUpdate), MasterController.updateUom);

const currencies = express.Router();
currencies.get('/', MasterController.listCurrencies);
currencies.post('/convert', validate(v.currencyConvert), MasterController.convertCurrency);
currencies.post('/', authorize(P.setting.CREATE), validate(v.currencyCreate), MasterController.createCurrency);
currencies.patch('/:id/rate', authorize(P.finance.UPDATE), validate(v.idParam, 'params'), validate(v.currencyRate), MasterController.updateCurrencyRate);

const taxes = express.Router();
taxes.get('/', MasterController.listTaxRates);
taxes.post('/compute', validate(v.taxCompute), MasterController.computeTax);
taxes.get('/hsn/:hsnCode', MasterController.taxForHsn);
taxes.post('/', authorize(P.finance.CREATE), validate(v.taxCreate), MasterController.createTaxRate);

module.exports = { manufacturers, categories, uoms, currencies, taxes };
