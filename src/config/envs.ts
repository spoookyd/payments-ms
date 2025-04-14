import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  STRIPE_SECRET: string;
  ENDPOINT_SECRET: string;
  SUCCESS_URL: string;
  CANCEL_URL: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    STRIPE_SECRET: joi.string().required(),
    ENDPOINT_SECRET: joi.string().required(),
    SUCCESS_URL: joi.string().required(),
    CANCEL_URL: joi.string().required(),
  })
  .unknown(true);

const validationSchema = envsSchema.validate(process.env);
const error: joi.ValidationError | undefined = validationSchema.error;
const value: EnvVars = validationSchema.value as EnvVars;
if (error) {
  throw new Error('Config Validation error: ' + error.message);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  stripe_secret: envVars.STRIPE_SECRET,
  endpoint_secret: envVars.ENDPOINT_SECRET,
  success_url: envVars.SUCCESS_URL,
  cancel_url: envVars.CANCEL_URL,
};
