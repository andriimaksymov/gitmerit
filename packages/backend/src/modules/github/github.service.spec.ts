import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { of, throwError } from 'rxjs';
import { GithubService } from './github.service';

const axios404 = (): AxiosError => {
  const err = new AxiosError('Not Found');
  (err as AxiosError).response = {
    status: 404,
    statusText: 'Not Found',
    data: {},
    headers: {},
    config: {} as never,
  };
  return err;
};

describe('GithubService', () => {
  let service: GithubService;
  let httpGet: jest.Mock;

  beforeEach(() => {
    httpGet = jest.fn();
    const httpService = { get: httpGet } as unknown as HttpService;
    const configService = {
      get: (key: string) =>
        key === 'github.apiBaseUrl' ? 'https://api.github.com' : '',
    } as unknown as ConfigService;
    service = new GithubService(configService, httpService);
  });

  describe('getUserData', () => {
    it('aggregates profile, repositories and events', async () => {
      const profile = { login: 'octocat' };
      const repos = [{ name: 'repo' }];
      const events = [{ id: 'e1' }];
      httpGet
        .mockReturnValueOnce(of({ data: profile }))
        .mockReturnValueOnce(of({ data: repos }))
        .mockReturnValueOnce(of({ data: events }));

      const result = await service.getUserData('octocat');

      expect(result).toEqual({
        profile,
        repositories: repos,
        events,
      });
      expect(httpGet).toHaveBeenCalledTimes(3);
    });

    it('throws NotFoundException for a missing user (404)', async () => {
      httpGet.mockReturnValueOnce(throwError(() => axios404()));
      await expect(service.getUserData('ghost')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rethrows non-404 errors', async () => {
      const boom = new Error('network down');
      httpGet.mockReturnValueOnce(throwError(() => boom));
      await expect(service.getUserData('octocat')).rejects.toBe(boom);
    });
  });

  describe('getRepoContent', () => {
    it('returns null on 404 instead of throwing', async () => {
      httpGet.mockReturnValueOnce(throwError(() => axios404()));
      await expect(
        service.getRepoContent('octocat', 'repo', 'README.md'),
      ).resolves.toBeNull();
    });
  });

  describe('getRepoLanguages', () => {
    it('returns the language map on success', async () => {
      httpGet.mockReturnValueOnce(of({ data: { TypeScript: 100 } }));
      await expect(
        service.getRepoLanguages('octocat', 'repo'),
      ).resolves.toEqual({ TypeScript: 100 });
    });

    it('returns an empty object on failure', async () => {
      httpGet.mockReturnValueOnce(throwError(() => new Error('boom')));
      await expect(
        service.getRepoLanguages('octocat', 'repo'),
      ).resolves.toEqual({});
    });
  });
});
