import dotenv from 'dotenv';

dotenv.config();

function required(key, fallback = undefined) {
  const val = process.env[key] ?? fallback;
  if (val === undefined) {
    // eslint-disable-next-line no-console
    console.warn(`[config] Missing env var "${key}". Using fallback / undefined.`);
  }
  return val;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: required('CLIENT_URL', 'http://localhost:5173'),

  mongodbUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/crm'),

  jwt: {
    secret: required('JWT_SECRET', 'dev_jwt_secret_change_me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_jwt_refresh_secret_change_me'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'Oracle RMS London North',
    fromAddress: process.env.SMTP_FROM_ADDRESS || 'noreply@brokerage.com',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || '15', 10),
  },

  defaults: {
    adminEmail: process.env.DEFAULT_ADMIN_EMAIL || 'admin@brokerage.com',
    adminPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!',
  },
};

export const isProd = config.env === 'production';
export const isDev = config.env === 'development';
