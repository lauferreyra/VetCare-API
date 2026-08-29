import { OmitType, PartialType } from '@nestjs/swagger';

import { CreatePrescriptionDto } from './create-prescription.dto.js';

export class UpdatePrescriptionDto extends PartialType(
  OmitType(CreatePrescriptionDto, ['petId'] as const),
) {}