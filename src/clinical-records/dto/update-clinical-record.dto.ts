import { PartialType } from '@nestjs/swagger';

import { CreateClinicalRecordDto } from './create-clinical-record.dto.js';

export class UpdateClinicalRecordDto extends PartialType(
  CreateClinicalRecordDto,
) {}