/**
 * StorageService
 * ------------------------------------------------------------
 * Abstraction over file storage to keep the rest of the backend
 * agnostic to where files actually live.
 *
 * Two backends are supported:
 *
 *   - LocalStorage : saves files to ./uploads, returns a URL like
 *                    `/uploads/xxx.png` served by Express static.
 *
 *   - OssStorage   : (placeholder) uploads files to Aliyun OSS and
 *                    returns the public URL.
 *
 * Selection is controlled by env var USE_OSS:
 *   USE_OSS=false (default) -> LocalStorage
 *   USE_OSS=true            -> OssStorage  (requires ali-oss installed)
 *
 * To enable OSS in production:
 *   1) `npm install ali-oss` inside backend/
 *   2) Set USE_OSS=true and OSS_* variables in .env
 *   3) Uncomment the ali-oss block in OssStorage.upload()
 * ------------------------------------------------------------
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class LocalStorage {
  constructor() {
    this.uploadDir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * @param {Express.Multer.File} file
   * @returns {Promise<{url: string, key: string}>}
   */
  async upload(file) {
    const ext = path.extname(file.originalname) || '';
    const key = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    const target = path.join(this.uploadDir, key);

    if (file.buffer) {
      // memoryStorage mode
      fs.writeFileSync(target, file.buffer);
    } else if (file.path) {
      // diskStorage mode -> rename
      fs.renameSync(file.path, target);
    } else {
      throw new Error('Invalid multer file object');
    }

    return { url: `/uploads/${key}`, key };
  }

  async delete(key) {
    const target = path.join(this.uploadDir, key);
    if (fs.existsSync(target)) fs.unlinkSync(target);
  }
}

class OssStorage {
  constructor() {
    // const OSS = require('ali-oss');
    // this.client = new OSS({
    //   region:          process.env.OSS_REGION,
    //   accessKeyId:     process.env.OSS_ACCESS_KEY_ID,
    //   accessKeySecret: process.env.OSS_ACCESS_SECRET,
    //   bucket:          process.env.OSS_BUCKET,
    //   endpoint:        process.env.OSS_ENDPOINT || undefined,
    // });
    this.publicBase = (process.env.OSS_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  }

  async upload(file) {
    const ext = path.extname(file.originalname) || '';
    const key = `gallery/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

    // ---- Real implementation (uncomment after `npm install ali-oss`) ----
    // const buffer = file.buffer || fs.readFileSync(file.path);
    // const result = await this.client.put(key, buffer);
    // const url = this.publicBase ? `${this.publicBase}/${key}` : result.url;
    // return { url, key };

    throw new Error(
      'OssStorage is a placeholder. Install "ali-oss" and uncomment the implementation in storageService.js.'
    );
  }

  async delete(key) {
    // await this.client.delete(key);
  }
}

const useOss = String(process.env.USE_OSS || '').toLowerCase() === 'true';
const storage = useOss ? new OssStorage() : new LocalStorage();

module.exports = storage;
module.exports.useOss = useOss;
