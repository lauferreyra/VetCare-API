import { Injectable } from '@nestjs/common';
import wkhtmltopdf from 'wkhtmltopdf';

type PrescriptionPdfData = {
  date: Date;
  medication: string;
  dosage: string;
  instructions: string | null;
  status: 'ACTIVE' | 'CANCELLED';

  pet: {
    name: string;
    species: string;
    breed: string | null;
  };
};

@Injectable()
export class PrescriptionPdfService {
  async generate(
    prescription: PrescriptionPdfData,
  ): Promise<Buffer> {
    const html = this.buildHtml(prescription);

    return new Promise((resolve, reject) => {
      const stream = wkhtmltopdf(html, {
        pageSize: 'A4',
        marginTop: '15mm',
        marginRight: '15mm',
        marginBottom: '15mm',
        marginLeft: '15mm',
        encoding: 'UTF-8',
      });

      const chunks: Buffer[] = [];

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      stream.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  private buildHtml(
    prescription: PrescriptionPdfData,
  ): string {
    const date =
      prescription.date.toLocaleDateString(
        'es-AR',
        {
          timeZone:
            'America/Argentina/Buenos_Aires',
        },
      );

    const status =
      prescription.status === 'ACTIVE'
        ? 'ACTIVA'
        : 'CANCELADA';

    return `
      <!DOCTYPE html>

      <html lang="es">
        <head>
          <meta charset="UTF-8" />

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              color: #1f2937;
              font-size: 14px;
              line-height: 1.5;
              margin: 0;
            }

            .header {
              text-align: center;
              border-bottom: 3px solid #0d9488;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }

            .brand {
              color: #0d9488;
              font-size: 30px;
              font-weight: bold;
              margin: 0;
            }

            .subtitle {
              margin-top: 5px;
              color: #6b7280;
              font-size: 16px;
            }

            .section {
              margin-bottom: 25px;
            }

            .section-title {
              color: #0d9488;
              font-size: 17px;
              font-weight: bold;
              margin-bottom: 10px;
            }

            .row {
              margin-bottom: 6px;
            }

            .label {
              font-weight: bold;
            }

            .medication-box {
              border: 1px solid #d1d5db;
              border-radius: 8px;
              padding: 20px;
              margin-top: 10px;
            }

            .status {
              margin-top: 30px;
              font-weight: bold;
            }

            .cancelled {
              color: #dc2626;
            }

            .active {
              color: #15803d;
            }

            .signature {
              margin-top: 70px;
              text-align: right;
            }

            .signature-line {
              display: inline-block;
              width: 220px;
              border-top: 1px solid #374151;
              padding-top: 8px;
              text-align: center;
            }

            .footer {
              margin-top: 60px;
              padding-top: 15px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 11px;
            }
          </style>
        </head>

        <body>

          <header class="header">
            <h1 class="brand">
              VetCare
            </h1>

            <div class="subtitle">
              Receta veterinaria
            </div>
          </header>

          <section class="section">

            <div class="section-title">
              Datos de la receta
            </div>

            <div class="row">
              <span class="label">
                Fecha:
              </span>

              ${date}
            </div>

          </section>

          <section class="section">

            <div class="section-title">
              Paciente
            </div>

            <div class="row">
              <span class="label">
                Mascota:
              </span>

              ${this.escapeHtml(
                prescription.pet.name,
              )}
            </div>

            <div class="row">
              <span class="label">
                Especie:
              </span>

              ${this.escapeHtml(
                prescription.pet.species,
              )}
            </div>

            ${
              prescription.pet.breed
                ? `
                  <div class="row">
                    <span class="label">
                      Raza:
                    </span>

                    ${this.escapeHtml(
                      prescription.pet.breed,
                    )}
                  </div>
                `
                : ''
            }

          </section>

          <section class="section">

            <div class="section-title">
              Prescripción
            </div>

            <div class="medication-box">

              <div class="row">
                <span class="label">
                  Medicamento:
                </span>

                ${this.escapeHtml(
                  prescription.medication,
                )}
              </div>

              <div class="row">
                <span class="label">
                  Dosis:
                </span>

                ${this.escapeHtml(
                  prescription.dosage,
                )}
              </div>

              ${
                prescription.instructions
                  ? `
                    <div class="row">
                      <span class="label">
                        Indicaciones:
                      </span>

                      ${this.escapeHtml(
                        prescription.instructions,
                      )}
                    </div>
                  `
                  : ''
              }

            </div>

          </section>

          <div
            class="status ${
              prescription.status === 'ACTIVE'
                ? 'active'
                : 'cancelled'
            }"
          >
            Estado: ${status}
          </div>

          <div class="signature">

            <div class="signature-line">
              Firma del veterinario
            </div>

          </div>

          <footer class="footer">
            VetCare · Receta veterinaria
          </footer>

        </body>
      </html>
    `;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}