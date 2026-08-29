import { Module } from '@nestjs/common';

import { ClinicalRecordsController } from './clinical-records.controller.js';
import { ClinicalRecordsService } from './clinical-records.service.js';

@Module({
  controllers: [
    ClinicalRecordsController,
  ],
  providers: [
    ClinicalRecordsService,
  ],
})
export class ClinicalRecordsModule {}