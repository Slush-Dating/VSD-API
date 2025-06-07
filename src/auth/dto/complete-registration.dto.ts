import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  GenderEnum,
  LookingForEnum,
  NextActionEnum,
  SexualityEnum,
} from '../../users/user.entity';

export class CompleteRegistrationDto {
  @IsEnum(NextActionEnum)
  @IsNotEmpty()
  action!: NextActionEnum;

  /**
   * Required when action = 'upload_avatar'
   */
  @ApiProperty({
    type: 'string',
    format: 'binary',
  })
  avatar?: Express.Multer.File;

  /**
   * Required when action = 'upload_video'
   */
  @ApiProperty({
    type: 'string',
    format: 'binary',
  })
  video?: Express.Multer.File;

  /**
   * Required when action = 'fill_firstname'
   * @example John
   */
  @ValidateIf(
    (o: CompleteRegistrationDto) => o.action === NextActionEnum.FILL_FIRSTNAME,
  )
  @MinLength(3)
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  /**
   * Required when action = 'fill_dateOfBirth'
   * @example 1996-12-16
   */
  @ValidateIf(
    (o: CompleteRegistrationDto) =>
      o.action === NextActionEnum.FILL_DATEOFBIRTH,
  )
  @IsDateString()
  @IsNotEmpty()
  dateOfBirth?: string;

  /**
   * Required when action = 'fill_height'
   * @example "174"
   */
  @ValidateIf(
    (o: CompleteRegistrationDto) => o.action === NextActionEnum.FILL_HEIGHT,
  )
  @IsNotEmpty()
  height?: string;

  /**
   * Required when action = 'fill_height'
   * Only allow ft/cm
   * @example "cm"
   */
  @ValidateIf(
    (o: CompleteRegistrationDto) => o.action === NextActionEnum.FILL_HEIGHT,
  )
  @IsNotEmpty()
  height_unit?: string;
  /**
   * Required when action = 'choose_gender'
   * @example male
   */
  @ValidateIf(
    (o: CompleteRegistrationDto) => o.action === NextActionEnum.CHOOSE_GENDER,
  )
  @IsEnum(GenderEnum)
  @IsNotEmpty()
  gender?: GenderEnum;

  /**
   * Required when action = 'fill_lookingfor'
   * @example meet new people
   */
  @ValidateIf(
    (o: CompleteRegistrationDto) => o.action === NextActionEnum.FILL_LOOKINGFOR,
  )
  @IsEnum(LookingForEnum)
  @IsNotEmpty()
  lookingFor?: LookingForEnum;

  /**
   * Required when action = 'fill_sexual_orientation'
   * @example female
   */
  @ValidateIf(
    (o: CompleteRegistrationDto) =>
      o.action === NextActionEnum.FILL_SEXUAL_ORIENTATION,
  )
  @IsEnum(SexualityEnum)
  @IsNotEmpty()
  sexuality?: SexualityEnum;

  /**
   * Required when action = 'fill_ethnicity'
   * @example [1, 2]
   */
  @ValidateIf(
    (o: CompleteRegistrationDto) => o.action === NextActionEnum.FILL_ETHNICITY,
  )
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsNumberString({}, { each: true })
  ethnicity?: number[];

  /**
   * Required when action = 'fill_password'
   * @example password
   */
  @ValidateIf(
    (o: CompleteRegistrationDto) => o.action === NextActionEnum.FILL_PASSWORD,
  )
  @IsNotEmpty()
  password?: string;

  /**
   * Required when action = 'fill_password'
   * @example password
   */
  @ValidateIf(
    (o: CompleteRegistrationDto) => o.action === NextActionEnum.FILL_PASSWORD,
  )
  @IsNotEmpty()
  confirm_password?: string;

  /**
   * Required when action = 'fill_height',
   * Required when action = 'choose_gender',
   * Required when action = 'fill_lookingfor',
   * Required when action = 'fill_sexual_orientation',
   * @example true/false
   */
  @ValidateIf(
    (o: CompleteRegistrationDto) =>
      o.action === NextActionEnum.FILL_HEIGHT ||
      o.action === NextActionEnum.CHOOSE_GENDER ||
      o.action === NextActionEnum.FILL_LOOKINGFOR ||
      o.action === NextActionEnum.FILL_SEXUAL_ORIENTATION,
  )
  @IsNotEmpty()
  displayOnProfile?: string;
}

/**
 * Required when action = 'verify_phone'
 * @example "+1 8798729318"
 */
// @ValidateIf(
//   (o: CompleteRegistrationDto) => o.action === NextActionEnum.VERIFY_PHONE,
// )
// @IsPhoneNumber()
// @IsNotEmpty()
// phoneNumber?: string;

/**
 * Required when action = 'verify_phone'
 * @example "FIREBASE_TOKEN"
 */
// @ValidateIf(
//   (o: CompleteRegistrationDto) => o.action === NextActionEnum.VERIFY_PHONE,
// )
// @IsString()
// @IsNotEmpty()
// token?: string;

/**
 * Required when action = 'fill_profile'
 * @example Doe
 */
// @ValidateIf(
//   (o: CompleteRegistrationDto) => o.action === NextActionEnum.FILL_PROFILE,
// )
// @MinLength(3)
// @IsString()
// @IsNotEmpty()
// lastName?: string;

/**
 * Required when action = 'fill_profile'
 * @example UK
 */
// @ValidateIf(
//   (o: CompleteRegistrationDto) => o.action === NextActionEnum.FILL_PROFILE,
// )
// @IsString()
// @IsNotEmpty()
// country?: string;

/**
 * Required when action = 'fill_profile'
 * @example London
 */
// @ValidateIf(
//   (o: CompleteRegistrationDto) => o.action === NextActionEnum.FILL_LOCATION,
// )
// @IsString()
// @IsNotEmpty()
// address?: string;

/**
 * Required when action = 'fill_location'
 * @example 21.1820972
 */
// @ValidateIf(
//   (o: CompleteRegistrationDto) => o.action === NextActionEnum.FILL_LOCATION,
// )
// @IsString()
// @IsNotEmpty()
// latitude?: string;

/**
 * Required when action = 'fill_profile'
 * @example 72.7905927
 */
// @ValidateIf(
//   (o: CompleteRegistrationDto) => o.action === NextActionEnum.FILL_LOCATION,
// )
// @IsString()
// @IsNotEmpty()
// longitude?: string;

/**
 * Required when action = 'fill_profile'
 * @example Travel Consultant
 */
// @ValidateIf(
//   (o: CompleteRegistrationDto) => o.action === NextActionEnum.FILL_PROFILE,
// )
// @IsString()
// @IsNotEmpty()
// jobTitle?: string;

/**
 * @example "I'm a programmer"
 */
// @ValidateIf(
//   (o: CompleteRegistrationDto) => o.action === NextActionEnum.FILL_PROFILE,
// )
// @IsOptional()
// @IsString()
// @IsNotEmpty()
// bio?: string;

/**
 * Required when action = 'interests'
 * @example [1, 2]
 */
// @ValidateIf(
//   (o: CompleteRegistrationDto) => o.action === NextActionEnum.FILL_INTERESTS,
// )
// @IsArray()
// @IsNotEmpty({ each: true })
// @IsNumberString({}, { each: true })
// interests?: number[];
