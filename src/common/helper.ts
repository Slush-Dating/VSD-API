import { extension, lookup } from 'mime-types';
import { storagePath } from './constants';
import { IPaginationOptions, Pagination } from 'nestjs-typeorm-paginate';
import { camelCase } from 'lodash';
import * as moment from 'moment';

export const guessFileContentType = (mimeType: string) => {
  return lookup(mimeType);
};

export const guessFileExtension = (mimeType: string) => {
  return extension(mimeType);
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

export const removeAliasFromList = (
  items: Record<string, any>[],
  aliases: string[],
) => {
  return items.map((item: Record<string, any>) => {
    return Object.fromEntries(
      Object.entries(item).map(([k, v]) => {
        aliases.forEach((a) => (k = k.replace(a, '')));
        return [camelCase(k), v];
      }),
    );
  });
};

export const calculateAge = (dateOfBirth: Date) => {
  return moment().diff(dateOfBirth, 'years', false);
};
