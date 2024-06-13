import React, { useMemo } from 'react';
import type { RenderInputProps } from '../type';
import { Box, Button, useDisclosure } from '@chakra-ui/react';
import { SelectAppItemType } from '@fastgpt/global/core/workflow/type/index.d';
import Avatar from '@/components/Avatar';
import SelectAppModal from '../../../../SelectAppModal';
import { useTranslation } from 'next-i18next';
import { useContextSelector } from 'use-context-selector';
import { WorkflowContext } from '@/components/core/workflow/context';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
import { getAppDetailById } from '@/web/core/app/api';

const SelectAppRender = ({ item, nodeId }: RenderInputProps) => {
  const { t } = useTranslation();
  const filterAppIds = useContextSelector(WorkflowContext, (ctx) => ctx.filterAppIds);
  const onChangeNode = useContextSelector(WorkflowContext, (v) => v.onChangeNode);

  const {
    isOpen: isOpenSelectApp,
    onOpen: onOpenSelectApp,
    onClose: onCloseSelectApp
  } = useDisclosure();

  const value = item.value as SelectAppItemType | undefined;
  const { data: appDetail, loading } = useRequest2(
    () => {
      if (value?.id) return getAppDetailById(value.id);
      return Promise.resolve(null);
    },
    {
      manual: false,
      refreshDeps: [value?.id],
      errorToast: 'Error',
      onError() {
        onChangeNode({
          nodeId,
          type: 'updateInput',
          key: 'app',
          value: {
            ...item,
            value: undefined
          }
        });
      }
    }
  );

  const Render = useMemo(() => {
    return (
      <>
        <Box onClick={onOpenSelectApp}>
          {!value ? (
            <Button variant={'whiteFlow'} w={'100%'}>
              {t('core.module.Select app')}
            </Button>
          ) : (
            <Button
              isLoading={loading}
              w={'100%'}
              justifyContent={loading ? 'center' : 'flex-start'}
              variant={'whiteFlow'}
              leftIcon={<Avatar src={appDetail?.avatar} w={6} />}
            >
              {appDetail?.name}
            </Button>
          )}
        </Box>

        {isOpenSelectApp && (
          <SelectAppModal
            value={item.value}
            filterAppIds={filterAppIds}
            onClose={onCloseSelectApp}
            onSuccess={(e) => {
              onChangeNode({
                nodeId,
                type: 'updateInput',
                key: 'app',
                value: {
                  ...item,
                  value: e
                }
              });
            }}
          />
        )}
      </>
    );
  }, [
    appDetail?.avatar,
    appDetail?.name,
    filterAppIds,
    isOpenSelectApp,
    item,
    loading,
    nodeId,
    onChangeNode,
    onCloseSelectApp,
    onOpenSelectApp,
    t,
    value
  ]);

  return Render;
};

export default React.memo(SelectAppRender);
