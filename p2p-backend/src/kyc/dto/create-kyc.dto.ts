import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { KycDocumentType } from '../enums/document-type.enum';

export class CreateKycDto {
  @IsNotEmpty()
  @IsEnum(KycDocumentType, {
    message: 'documentType must be either NATIONAL_ID, PASSPORT, or DRIVING_LICENSE',
  })
  documentType: KycDocumentType;

  @IsNotEmpty()
  @IsString()
  documentNumber: string;
}