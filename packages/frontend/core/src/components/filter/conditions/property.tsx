import type { FilterParams } from '@affine/core/modules/collection-rules';
import { WorkspacePropertyService } from '@affine/core/modules/workspace-property';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';

import { WorkspacePropertyIcon, WorkspacePropertyName } from '../../properties';
import {
  isSupportedWorkspacePropertyType,
  WorkspacePropertyTypes,
} from '../../workspace-property-types';
import { Condition } from './condition';

export const PropertyFilterCondition = ({
  filter,
  onChange,
}: {
  filter: FilterParams;
  onChange: (filter: FilterParams) => void;
}) => {
  const t = useI18n();
  const workspacePropertyService = useService(WorkspacePropertyService);
  const propertyInfo = useLiveData(
    workspacePropertyService.propertyInfo$(filter.key)
  );

  const propertyType = propertyInfo?.type;

  if (!propertyInfo) {
    // TODO: need a fallback
    return null;
  }

  const type = isSupportedWorkspacePropertyType(propertyType)
    ? WorkspacePropertyTypes[propertyType]
    : undefined;

  const methods = type?.filterMethod;
  const Value = type?.filterValue;

  if (!type || !methods) {
    // TODO: need a fallback
    return null;
  }

  return (
    <Condition
      filter={filter}
      icon={<WorkspacePropertyIcon propertyInfo={propertyInfo} />}
      name={<WorkspacePropertyName propertyInfo={propertyInfo} />}
      methods={Object.entries(methods).map(([key, i18nKey]) => [
        key,
        t.t(i18nKey as string),
      ])}
      value={Value && <Value filter={filter} onChange={onChange} />}
      onChange={onChange}
    />
  );
};
