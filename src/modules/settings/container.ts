import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { DrizzleSettingsRepository } from './repositories/drizzle-settings.repository';
import { SettingsFindProfileService } from './services/settings-find-profile.service';
import { SettingsUpdateProfileService } from './services/settings-update-profile.service';
import { SettingsSetDefaultCompanyService } from './services/settings-set-default-company.service';

export function createSettingsContainer(db: DbExecutor) {
  const repository = new DrizzleSettingsRepository(db); // the ONLY place the concrete repository is named

  return {
    repository,
    findProfileService: new SettingsFindProfileService(repository),
    updateProfileService: new SettingsUpdateProfileService(repository),
    setDefaultCompanyService: new SettingsSetDefaultCompanyService(repository),
  };
}
