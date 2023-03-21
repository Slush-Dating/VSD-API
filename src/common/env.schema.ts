import * as Joi from 'joi';

export const EnvSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production'),
  NEST_DEBUG: Joi.boolean(),
  PORT: Joi.number().default(3000),
  APP_NAME: Joi.string().max(25),
  APP_URL: Joi.string().uri(),
  JWT_SECRET_KEY: Joi.string().max(30),
  JWT_EXPIRES_IN: Joi.string(),

  DB_HOST: Joi.string().ip(),
  DB_PORT: Joi.number(),
  DB_DATABASE: Joi.string(),
  DB_USERNAME: Joi.string(),
  DB_PASSWORD: Joi.string(),

  FIREBASE_SERVICE_ACCOUNT_KEY: Joi.string().pattern(/\.(json)$/i),

  GOOGLE_WEB_CLIENT_ID: Joi.string(),
  GOOGLE_ANDROID_CLIENT_ID: Joi.string(),
  GOOGLE_IOS_CLIENT_ID: Joi.string(),

  FACEBOOK_APP_ID: Joi.string(),
  FACEBOOK_SECRET: Joi.string(),

  APPLE_CLIENT_ID: Joi.string(),
  APPLE_CLIENT_SECRET: Joi.string(),

  AWS_ACCESS_KEY_ID: Joi.string(),
  AWS_SECRET_ACCESS_KEY: Joi.string(),
  AWS_REGION: Joi.string(),
  AWS_BUCKET: Joi.string(),

  MAIL_HOST: Joi.string().hostname(),
  MAIL_PORT: Joi.number(),
  MAIL_USERNAME: Joi.string().email(),
  MAIL_PASSWORD: Joi.string(),
  MAIL_ENCRYPTION: Joi.string(),
  MAIL_FROM: Joi.string(),

  MAILCHIMP_API_KEY: Joi.string(),
  MAILCHIMP_CAMPAIGN_ID: Joi.string(),
  MAILCHIMP_SERVER_PREFIX: Joi.string(),

  AGORA_APP_ID: Joi.string(),
  AGORA_APP_CERTIFICATE: Joi.string(),
});
