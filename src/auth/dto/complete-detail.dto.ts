import { IsEnum, IsNotEmpty, IsNumber, ValidateIf } from 'class-validator';
import {
  IdealVacationEnum,
  CookingSkillEnum,
  NextDetailActionEnum,
  SmokingOpinionEnum,
} from '../../users/user.entity';

export class CompleteDetailDto {
  @IsEnum(NextDetailActionEnum)
  @IsNotEmpty()
  action!: NextDetailActionEnum;

  /**
   * Required when action = 'fill_ideal_vacation'
   * @example Beach Bum Bliss
   */
  @ValidateIf(
    (o: CompleteDetailDto) =>
      o.action === NextDetailActionEnum.FILL_IDEAL_VACATION,
  )
  @IsEnum(IdealVacationEnum)
  @IsNotEmpty()
  ideal_vacation?: IdealVacationEnum;

  /**
   * Required when action = 'fill_distance'
   * @example 350
   */
  @ValidateIf(
    (o: CompleteDetailDto) => o.action === NextDetailActionEnum.FILL_DISTANCE,
  )
  @IsNotEmpty()
  distance?: number;

  /**
   * Required when action = 'fill_cooking_skill'
   * @example Master of the Spatula
   */
  @ValidateIf(
    (o: CompleteDetailDto) =>
      o.action === NextDetailActionEnum.FILL_COOKING_SKILL,
  )
  @IsEnum(CookingSkillEnum)
  @IsNotEmpty()
  cooking_skill?: CookingSkillEnum;

  /**
   * Required when action = 'fill_opinion_smoking'
   * @example Can't stand it
   */
  @ValidateIf(
    (o: CompleteDetailDto) =>
      o.action === NextDetailActionEnum.FILL_OPINION_SMOKING,
  )
  @IsEnum(SmokingOpinionEnum)
  @IsNotEmpty()
  smoking_opinion?: SmokingOpinionEnum;
}
