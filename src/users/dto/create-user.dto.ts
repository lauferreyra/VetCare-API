import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'Lautaro Ferreyra',
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    example: 'lautaro@vetcare.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}