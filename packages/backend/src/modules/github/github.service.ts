import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  GithubData,
  GithubProfile,
  GithubRepo,
  GithubEvent,
} from './interfaces/github.interfaces';

@Injectable()
export class GithubService {
  private readonly apiBaseUrl: string;
  private readonly apiToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiBaseUrl =
      this.configService.get<string>('github.apiBaseUrl') ||
      'https://api.github.com';
    this.apiToken = this.configService.get<string>('github.apiToken') || '';
  }

  async getUserData(username: string): Promise<GithubData> {
    try {
      const headers = this.apiToken
        ? { Authorization: `token ${this.apiToken}` }
        : {};

      // Fetch user profile
      const userResponse = await firstValueFrom(
        this.httpService.get<GithubProfile>(
          `${this.apiBaseUrl}/users/${username}`,
          {
            headers,
          },
        ),
      );

      // Fetch user repositories
      const reposResponse = await firstValueFrom(
        this.httpService.get<GithubRepo[]>(
          `${this.apiBaseUrl}/users/${username}/repos?per_page=100&sort=updated`,
          { headers },
        ),
      );

      // Fetch user events (for activity analysis)
      const eventsResponse = await firstValueFrom(
        this.httpService.get<GithubEvent[]>(
          `${this.apiBaseUrl}/users/${username}/events/public?per_page=100`,
          { headers },
        ),
      );

      return {
        profile: userResponse.data,
        repositories: reposResponse.data,
        events: eventsResponse.data,
      };
    } catch (error: unknown) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        throw new NotFoundException(`GitHub user '${username}' not found`);
      }
      throw error;
    }
  }

  async getRepoContent(
    username: string,
    repo: string,
    path: string = '',
  ): Promise<unknown> {
    try {
      const headers = this.apiToken
        ? { Authorization: `token ${this.apiToken}` }
        : {};

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiBaseUrl}/repos/${username}/${repo}/contents/${path}`,
          { headers },
        ),
      );
      return response.data;
    } catch (error: unknown) {
      // If file not found, return null instead of throwing
      if (error instanceof AxiosError && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getRepoLanguages(
    username: string,
    repo: string,
  ): Promise<Record<string, number>> {
    try {
      const headers = this.apiToken
        ? { Authorization: `token ${this.apiToken}` }
        : {};

      const response = await firstValueFrom(
        this.httpService.get<Record<string, number>>(
          `${this.apiBaseUrl}/repos/${username}/${repo}/languages`,
          { headers },
        ),
      );
      return response.data;
    } catch {
      return {};
    }
  }
}
