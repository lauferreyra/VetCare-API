import { Module } from '@nestjs/common';

import { PrescriptionsController } from './prescriptions.controller.js';
import { PrescriptionsService } from './prescriptions.service.js';
import { PrescriptionPdfService } from './pdf/prescription-pdf.service.js';

@Module({
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, PrescriptionPdfService],
})
export class PrescriptionsModule {}