import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConfidenceScore } from '../../../generated/prisma/client';

export class CreateCheckInDto {
  @ApiProperty({
    description: 'Giá trị tiến độ mới cập nhật cho Key Result',
    example: 85,
  })
  newValue: number;

  @ApiPropertyOptional({
    description: 'Đánh giá mức độ tự tin (LOW, MEDIUM, HIGH)',
    enum: ConfidenceScore,
    example: ConfidenceScore.HIGH,
  })
  confidenceScore?: ConfidenceScore;

  @ApiPropertyOptional({
    description: 'Ghi chú về tiến độ, thành tựu đạt được trong kỳ check-in này',
    example: 'Đã hoàn thành tối ưu hóa 15 query chậm trong hệ thống core',
  })
  note?: string;

  @ApiPropertyOptional({
    description:
      'Rào cản / Khó khăn gặp phải cần quản lý hỗ trợ giải quyết (Blockers)',
    example: 'Cần đội Hạ tầng cấp thêm tài nguyên CPU cho cụm DB Staging',
  })
  blocker?: string;
}
