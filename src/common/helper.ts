import { extension, lookup } from 'mime-types';
import * as uuid from 'uuid';
import { unlink, mkdir, writeFile } from 'fs/promises';
import { Logger } from '@nestjs/common';
import { storagePath } from './constants';
import { existsSync } from 'fs';
import { IPaginationOptions, Pagination } from 'nestjs-typeorm-paginate';

export const guessFileContentType = (file: Express.Multer.File) => {
  return lookup(file.mimetype);
};

export const guessFileExtension = (file: Express.Multer.File) => {
  return extension(file.mimetype);
};

export const storeAs = async (dir: string, file: Express.Multer.File) => {
  const fileName = `${dir}/${uuid.v4()}.${guessFileExtension(file)}`;

  // create public dir
  const publicDirExists = existsSync('public');
  if (!publicDirExists) await mkdir('public');

  // create storage dir
  const storageDirExists = existsSync(storagePath);
  if (!storageDirExists) await mkdir(storagePath);

  // create provided dir
  const exists = existsSync(`${storagePath}/${dir}`);
  if (!exists) await mkdir(`${storagePath}/${dir}`);

  // save
  try {
    await writeFile(`${storagePath}/${fileName}`, file.buffer);
    return fileName;
  } catch (error) {
    Logger.log(error.message);
    throw error;
  }
};

export const unlinkFile = async (filename: string): Promise<void> => {
  try {
    await unlink(storagePath + `/${filename}`);
  } catch (error) {
    Logger.log(error.message);
  }
};

export const baseUrl = (value?: string) => {
  if (!value) return value;

  if (value[0] !== '/') {
    value = `/${value}`;
  }

  return process.env.APP_URL + ('/' + value).replace(/\/\//g, '/');
};

export const storageUrl = (value?: string): string => {
  if (!value) {
    return value;
  }

  if (value.includes('http')) {
    return value;
  }

  if (value[0] !== '/') {
    value = `/${value}`;
  }

  return (
    process.env.APP_URL +
    ('/' + storagePath.replace('public', '') + value).replace('//', '/')
  );
};

export const bucketUrl = (value: string): string => {
  if (value.includes('http')) {
    return value;
  }
  return `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${value}`;
};

export const defaultPaginationPayload = (
  options: IPaginationOptions,
): Pagination<any> => {
  return {
    items: [],
    meta: {
      totalItems: 0,
      totalPages: 0,
      itemCount: 0,
      currentPage: Number(options.page),
      itemsPerPage: Number(options.limit),
    },
  };
};

export const randomFixedInteger = (length: number): number => {
  return Math.floor(
    Math.pow(10, length - 1) +
      Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1),
  );
};

export const createFcmPayload = (payload: {
  tokens: string[];
  title: string;
  body: string;
  data?: { [key: string]: string };
}) => {
  return {
    data: payload.data,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    android: {
      notification: {
        notificationCount: 1,
      },
    },
    apns: {
      payload: {
        aps: {
          badge: 1,
        },
      },
    },
    tokens: payload.tokens,
  };
};
