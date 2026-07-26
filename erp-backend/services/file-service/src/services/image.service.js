'use strict';

const sharp = require('sharp');
const { logger } = require('@erp/shared');
const FileRepository = require('../repositories/file.repository');
const { getProviderFor } = require('./providers');
const { variantKey } = require('../utils/keyBuilder');
const config = require('../config');
const { PROCESS_STATUS, VISIBILITY } = require('../constants');

async function toBuffer(stream) {
  if (Buffer.isBuffer(stream)) return stream;
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

class ImageService {
  /**
   * Generates WebP thumbnails for every configured size that is smaller than
   * the source, then records them on the file row.
   */
  static async generateVariants(fileId) {
    const file = await FileRepository.findById(fileId);
    if (!file) throw new Error(`File ${fileId} not found`);

    await FileRepository.update(fileId, { processStatus: PROCESS_STATUS.PROCESSING });

    const provider = getProviderFor(file);
    const source = await toBuffer(await provider.getStream(file.storageKey));

    const metadata = await sharp(source).metadata();
    const variants = {};

    for (const size of config.images.thumbnailSizes) {
      if (metadata.width && metadata.width <= size) continue;

      const buffer = await sharp(source)
        .rotate()
        .resize({ width: size, withoutEnlargement: true })
        .webp({ quality: config.images.quality })
        .toBuffer();

      const key = variantKey(file.storageKey, String(size));

      const stored = await provider.put({
        buffer,
        key,
        mimeType: 'image/webp',
        visibility: file.visibility,
        metadata: { parentFileId: file.id, variant: String(size) }
      });

      variants[`w${size}`] = {
        key,
        sizeBytes: buffer.length,
        url: file.visibility === VISIBILITY.PUBLIC ? stored.publicUrl : null
      };
    }

    const updated = await FileRepository.update(fileId, {
      width: metadata.width || null,
      height: metadata.height || null,
      variants: Object.keys(variants).length ? variants : null,
      processStatus: PROCESS_STATUS.DONE
    });

    logger.info('Generated %d variant(s) for file %s', Object.keys(variants).length, fileId);
    return { fileId, variants: Object.keys(variants), width: updated.width, height: updated.height };
  }

  static async markFailed(fileId, error) {
    await FileRepository.update(fileId, {
      processStatus: PROCESS_STATUS.FAILED,
      metadata: { processingError: String(error).slice(0, 300) }
    }).catch(() => {});
  }
}

module.exports = ImageService;
