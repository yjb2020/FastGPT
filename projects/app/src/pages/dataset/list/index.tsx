import React, { useMemo, useRef, useState } from 'react';
import { Box, Flex, Grid, useDisclosure, Image, Button } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import PageContainer from '@/components/PageContainer';
import { useConfirm } from '@fastgpt/web/hooks/useConfirm';
import { AddIcon } from '@chakra-ui/icons';
import { useQuery } from '@tanstack/react-query';
import {
  delDatasetById,
  getDatasetPaths,
  putDatasetById,
  postCreateDataset
} from '@/web/core/dataset/api';
import { checkTeamExportDatasetLimit } from '@/web/support/user/team/api';
import { useTranslation } from 'next-i18next';
import Avatar from '@/components/Avatar';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { serviceSideProps } from '@/web/common/utils/i18n';
import dynamic from 'next/dynamic';
import { DatasetTypeEnum, DatasetTypeMap } from '@fastgpt/global/core/dataset/constants';
import { FolderImgUrl, FolderIcon } from '@fastgpt/global/common/file/image/constants';
import MyMenu from '@fastgpt/web/components/common/MyMenu';
import { useRequest } from '@fastgpt/web/hooks/useRequest';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import { useEditTitle } from '@/web/common/hooks/useEditTitle';
import EditFolderModal, { useEditFolder } from '../component/EditFolderModal';
import { useDrag } from '@/web/common/hooks/useDrag';
import { useUserStore } from '@/web/support/user/useUserStore';
import PermissionIconText from '@/components/support/permission/IconText';
import { PermissionTypeEnum } from '@fastgpt/global/support/permission/constant';
import { DatasetItemType } from '@fastgpt/global/core/dataset/type';
import ParentPaths from '@/components/common/ParentPaths';
import DatasetTypeTag from '@/components/core/dataset/DatasetTypeTag';
import { useToast } from '@fastgpt/web/hooks/useToast';
import { getErrText } from '@fastgpt/global/common/error/utils';
import { useDatasetStore } from '@/web/core/dataset/store/dataset';
import { downloadFetch } from '@/web/common/system/utils';
import EmptyTip from '@fastgpt/web/components/common/EmptyTip';

const CreateModal = dynamic(() => import('./component/CreateModal'), { ssr: false });
const MoveModal = dynamic(() => import('./component/MoveModal'), { ssr: false });

const Dataset = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();
  const { parentId } = router.query as { parentId: string };
  const { setLoading } = useSystemStore();
  const { userInfo } = useUserStore();
  const { myDatasets, loadMyDatasets, setMyDatasets } = useDatasetStore();

  const DeleteTipsMap = useRef({
    [DatasetTypeEnum.folder]: t('dataset.deleteFolderTips'),
    [DatasetTypeEnum.dataset]: t('core.dataset.Delete Confirm'),
    [DatasetTypeEnum.websiteDataset]: t('core.dataset.Delete Confirm'),
    [DatasetTypeEnum.externalFile]: t('core.dataset.Delete Confirm')
  });

  const { openConfirm, ConfirmModal } = useConfirm({
    type: 'delete'
  });
  const { onOpenModal: onOpenTitleModal, EditModal: EditTitleModal } = useEditTitle({
    title: t('Rename')
  });
  const { moveDataId, setMoveDataId, dragStartId, setDragStartId, dragTargetId, setDragTargetId } =
    useDrag();

  const {
    isOpen: isOpenCreateModal,
    onOpen: onOpenCreateModal,
    onClose: onCloseCreateModal
  } = useDisclosure();
  const { editFolderData, setEditFolderData } = useEditFolder();

  /* 点击删除 */
  const { mutate: onclickDelDataset } = useRequest({
    mutationFn: async (id: string) => {
      setLoading(true);
      await delDatasetById(id);
      return id;
    },
    onSuccess(id: string) {
      setMyDatasets(myDatasets.filter((item) => item._id !== id));
    },
    onSettled() {
      setLoading(false);
    },
    successToast: t('common.Delete Success'),
    errorToast: t('dataset.Delete Dataset Error')
  });
  // check export limit
  const { mutate: exportDataset } = useRequest({
    mutationFn: async (dataset: DatasetItemType) => {
      setLoading(true);
      await checkTeamExportDatasetLimit(dataset._id);

      await downloadFetch({
        url: `/api/core/dataset/exportAll?datasetId=${dataset._id}`,
        filename: `${dataset.name}.csv`
      });
    },
    onSuccess() {
      toast({
        status: 'success',
        title: t('core.dataset.Start export')
      });
    },
    onSettled() {
      setLoading(false);
    },
    errorToast: t('dataset.Export Dataset Limit Error')
  });

  const { data, refetch, isFetching } = useQuery(
    ['loadDataset', parentId],
    () => {
      return Promise.all([loadMyDatasets(parentId), getDatasetPaths(parentId)]);
    },
    {
      onError(err) {
        toast({
          status: 'error',
          title: t(getErrText(err))
        });
      }
    }
  );

  const paths = data?.[1] || [];

  const formatDatasets = useMemo(
    () =>
      myDatasets.map((item) => {
        return {
          ...item,
          label: DatasetTypeMap[item.type]?.label,
          icon: DatasetTypeMap[item.type]?.icon
        };
      }),
    [myDatasets]
  );

  return (
    <PageContainer
      isLoading={myDatasets.length === 0 && isFetching}
      insertProps={{ px: [5, '48px'] }}
    >
      <Flex pt={[4, '30px']} alignItems={'center'} justifyContent={'space-between'}>
        {/* url path */}
        <ParentPaths
          paths={paths.map((path, i) => ({
            parentId: path.parentId,
            parentName: path.parentName
          }))}
          FirstPathDom={
            <Flex flex={1} alignItems={'center'}>
              <Image src={'/imgs/workflow/db.png'} alt={''} mr={2} h={'24px'} />
              <Box className="textlg" letterSpacing={1} fontSize={'24px'} fontWeight={'bold'}>
                {t('core.dataset.My Dataset')}
              </Box>
            </Flex>
          }
          onClick={(e) => {
            router.push({
              query: {
                parentId: e
              }
            });
          }}
        />
        {/* create icon */}
        {userInfo?.team?.permission.hasWritePer && (
          <MyMenu
            offset={[-30, 5]}
            width={120}
            Button={
              <Button variant={'primaryOutline'} px={0}>
                <Flex alignItems={'center'} px={'20px'}>
                  <AddIcon mr={2} />
                  <Box>{t('common.Create New')}</Box>
                </Flex>
              </Button>
            }
            menuList={[
              {
                children: [
                  {
                    label: (
                      <Flex>
                        <MyIcon name={FolderIcon} w={'20px'} mr={1} />
                        {t('Folder')}
                      </Flex>
                    ),
                    onClick: () => setEditFolderData({})
                  },
                  {
                    label: (
                      <Flex>
                        <Image src={'/imgs/workflow/db.png'} alt={''} w={'20px'} mr={1} />
                        {t('core.dataset.Dataset')}
                      </Flex>
                    ),
                    onClick: onOpenCreateModal
                  }
                ]
              }
            ]}
          />
        )}
      </Flex>
      <Grid
        py={5}
        gridTemplateColumns={['1fr', 'repeat(2,1fr)', 'repeat(3,1fr)', 'repeat(4,1fr)']}
        gridGap={5}
        userSelect={'none'}
      >
        {formatDatasets.map((dataset) => (
          <Box
            display={'flex'}
            flexDirection={'column'}
            key={dataset._id}
            py={3}
            px={5}
            cursor={'pointer'}
            borderWidth={1.5}
            borderColor={dragTargetId === dataset._id ? 'primary.600' : 'borderColor.low'}
            bg={'white'}
            borderRadius={'md'}
            minH={'130px'}
            position={'relative'}
            data-drag-id={dataset.type === DatasetTypeEnum.folder ? dataset._id : undefined}
            draggable
            onDragStart={(e) => {
              setDragStartId(dataset._id);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              const targetId = e.currentTarget.getAttribute('data-drag-id');
              if (!targetId) return;
              DatasetTypeEnum.folder && setDragTargetId(targetId);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragTargetId(undefined);
            }}
            onDrop={async (e) => {
              e.preventDefault();
              if (!dragTargetId || !dragStartId || dragTargetId === dragStartId) return;
              // update parentId
              try {
                await putDatasetById({
                  id: dragStartId,
                  parentId: dragTargetId
                });
                refetch();
              } catch (error) {}
              setDragTargetId(undefined);
            }}
            _hover={{
              borderColor: 'primary.300',
              boxShadow: '1.5',
              '& .delete': {
                display: 'block'
              }
            }}
            onClick={() => {
              if (dataset.type === DatasetTypeEnum.folder) {
                router.push({
                  pathname: '/dataset/list',
                  query: {
                    parentId: dataset._id
                  }
                });
              } else {
                router.push({
                  pathname: '/dataset/detail',
                  query: {
                    datasetId: dataset._id
                  }
                });
              }
            }}
          >
            {userInfo?.team?.permission.hasWritePer && dataset.isOwner && (
              <Box
                position={'absolute'}
                top={3}
                right={3}
                borderRadius={'md'}
                _hover={{
                  color: 'primary.500',
                  '& .icon': {
                    bg: 'myGray.100'
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <MyMenu
                  width={120}
                  Button={
                    <Box w={'22px'} h={'22px'}>
                      <MyIcon
                        className="icon"
                        name={'more'}
                        h={'16px'}
                        w={'16px'}
                        px={1}
                        py={1}
                        borderRadius={'md'}
                        cursor={'pointer'}
                      />
                    </Box>
                  }
                  menuList={[
                    {
                      children: [
                        {
                          label: (
                            <Flex alignItems={'center'}>
                              <MyIcon name={'edit'} w={'14px'} mr={2} />
                              {t('Rename')}
                            </Flex>
                          ),
                          onClick: () =>
                            onOpenTitleModal({
                              defaultVal: dataset.name,
                              onSuccess: (val) => {
                                if (val === dataset.name || !val) return;
                                putDatasetById({
                                  id: dataset._id,
                                  name: val
                                });
                              }
                            })
                        },
                        {
                          label: (
                            <Flex alignItems={'center'}>
                              <MyIcon name={'common/file/move'} w={'14px'} mr={2} />
                              {t('Move')}
                            </Flex>
                          ),
                          onClick: () => setMoveDataId(dataset._id)
                        },
                        {
                          label: (
                            <Flex alignItems={'center'}>
                              <MyIcon name={'export'} w={'14px'} mr={2} />
                              {t('Export')}
                            </Flex>
                          ),
                          onClick: () => {
                            exportDataset(dataset);
                          }
                        },
                        ...(dataset.permission === PermissionTypeEnum.private
                          ? [
                              {
                                label: (
                                  <Flex alignItems={'center'}>
                                    <MyIcon
                                      name={'support/permission/publicLight'}
                                      w={'14px'}
                                      mr={2}
                                    />
                                    {t('permission.Set Public')}
                                  </Flex>
                                ),
                                onClick: () => {
                                  putDatasetById({
                                    id: dataset._id,
                                    permission: PermissionTypeEnum.public
                                  });
                                }
                              }
                            ]
                          : [
                              {
                                label: (
                                  <Flex alignItems={'center'}>
                                    <MyIcon
                                      name={'support/permission/privateLight'}
                                      w={'14px'}
                                      mr={2}
                                    />
                                    {t('permission.Set Private')}
                                  </Flex>
                                ),
                                onClick: () => {
                                  putDatasetById({
                                    id: dataset._id,
                                    permission: PermissionTypeEnum.private
                                  });
                                }
                              }
                            ])
                      ]
                    },
                    {
                      children: [
                        {
                          label: (
                            <Flex alignItems={'center'}>
                              <MyIcon name={'delete'} w={'14px'} mr={2} />
                              {t('common.Delete')}
                            </Flex>
                          ),
                          type: 'danger',
                          onClick: () => {
                            openConfirm(
                              () => onclickDelDataset(dataset._id),
                              undefined,
                              DeleteTipsMap.current[dataset.type]
                            )();
                          }
                        }
                      ]
                    }
                  ]}
                />
              </Box>
            )}
            <Flex alignItems={'center'} h={'38px'}>
              <Avatar src={dataset.avatar} borderRadius={'md'} w={'28px'} />
              <Box mx={3} className="textEllipsis3">
                {dataset.name}
              </Box>
            </Flex>
            <Box
              flex={1}
              className={'textEllipsis3'}
              py={1}
              wordBreak={'break-all'}
              fontSize={'xs'}
              color={'myGray.500'}
            >
              {dataset.intro ||
                (dataset.type === DatasetTypeEnum.folder
                  ? t('core.dataset.Folder placeholder')
                  : t('core.dataset.Intro Placeholder'))}
            </Box>
            <Flex alignItems={'center'} fontSize={'sm'}>
              <Box flex={1}>
                <PermissionIconText permission={dataset.permission} color={'myGray.600'} />
              </Box>
              {dataset.type !== DatasetTypeEnum.folder && (
                <DatasetTypeTag type={dataset.type} py={1} px={2} />
              )}
            </Flex>
          </Box>
        ))}
      </Grid>
      {myDatasets.length === 0 && (
        <EmptyTip pt={'35vh'} text={t('core.dataset.Empty Dataset Tips')}></EmptyTip>
      )}
      <ConfirmModal />
      <EditTitleModal />
      {isOpenCreateModal && <CreateModal onClose={onCloseCreateModal} parentId={parentId} />}
      {!!editFolderData && (
        <EditFolderModal
          onClose={() => setEditFolderData(undefined)}
          editCallback={async (name) => {
            try {
              await postCreateDataset({
                parentId,
                name,
                type: DatasetTypeEnum.folder,
                avatar: FolderImgUrl,
                intro: ''
              });
              refetch();
            } catch (error) {
              return Promise.reject(error);
            }
          }}
          isEdit={false}
        />
      )}
      {!!moveDataId && (
        <MoveModal
          moveDataId={moveDataId}
          onClose={() => setMoveDataId('')}
          onSuccess={() => {
            refetch();
            setMoveDataId('');
          }}
        />
      )}
    </PageContainer>
  );
};

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content, ['dataset']))
    }
  };
}

export default Dataset;
