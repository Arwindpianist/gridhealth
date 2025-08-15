import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { Organization } from './organization.entity';
import { MonitoringConfig } from './monitoring-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, MonitoringConfig])],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {} 