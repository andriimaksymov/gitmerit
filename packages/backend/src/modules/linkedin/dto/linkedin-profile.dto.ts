import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ExperienceDto {
  @IsString()
  role: string;

  @IsString()
  company: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  achievements?: string[];
}

export class LinkedInProfileDto {
  @IsString()
  fullName: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  headline?: string;

  @IsString()
  about: string;

  @IsOptional()
  @IsString()
  profileText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRoles?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experience: ExperienceDto[];

  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
