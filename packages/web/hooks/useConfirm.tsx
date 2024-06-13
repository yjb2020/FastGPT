import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDisclosure, Button, ModalBody, ModalFooter } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import MyModal from '../components/common/MyModal';

export const useConfirm = (props?: {
  title?: string;
  iconSrc?: string | '';
  content?: string;
  showCancel?: boolean;
  type?: 'common' | 'delete';
  hideFooter?: boolean;
}) => {
  const { t } = useTranslation();

  const map = useMemo(() => {
    const map = {
      common: {
        title: t('common.confirm.Common Tip'),
        bg: undefined,
        iconSrc: 'common/confirm/commonTip'
      },
      delete: {
        title: t('common.Delete Warning'),
        bg: 'red.600',
        iconSrc: 'common/confirm/deleteTip'
      }
    };
    if (props?.type && map[props.type]) return map[props.type];
    return map.common;
  }, [props?.type, t]);

  const {
    title = map?.title || t('Warning'),
    iconSrc = map?.iconSrc,
    content,
    showCancel = true,
    hideFooter = false
  } = props || {};
  const [customContent, setCustomContent] = useState<string | React.ReactNode>(content);

  const { isOpen, onOpen, onClose } = useDisclosure();

  const confirmCb = useRef<Function>();
  const cancelCb = useRef<any>();

  const openConfirm = useCallback(
    (confirm?: Function, cancel?: any, customContent?: string | React.ReactNode) => {
      confirmCb.current = confirm;
      cancelCb.current = cancel;

      customContent && setCustomContent(customContent);

      return onOpen;
    },
    []
  );

  const ConfirmModal = useCallback(
    ({
      closeText = t('common.Cancel'),
      confirmText = t('common.Confirm'),
      isLoading,
      bg,
      countDown = 0
    }: {
      closeText?: string;
      confirmText?: string;
      isLoading?: boolean;
      bg?: string;
      countDown?: number;
    }) => {
      const timer = useRef<any>();
      const [countDownAmount, setCountDownAmount] = useState(countDown);
      const [requesting, setRequesting] = useState(false);

      useEffect(() => {
        timer.current = setInterval(() => {
          setCountDownAmount((val) => {
            if (val <= 0) {
              clearInterval(timer.current);
            }
            return val - 1;
          });
        }, 1000);
      }, []);

      return (
        <MyModal isOpen={isOpen} iconSrc={iconSrc} title={title} maxW={['90vw', '400px']}>
          <ModalBody pt={5} whiteSpace={'pre-wrap'} fontSize={'sm'}>
            {customContent}
          </ModalBody>
          {!hideFooter && (
            <ModalFooter>
              {showCancel && (
                <Button
                  size={'sm'}
                  variant={'whiteBase'}
                  onClick={() => {
                    onClose();
                    typeof cancelCb.current === 'function' && cancelCb.current();
                  }}
                  px={5}
                >
                  {closeText}
                </Button>
              )}

              <Button
                size={'sm'}
                bg={bg ? bg : map.bg}
                isDisabled={countDownAmount > 0}
                ml={3}
                isLoading={isLoading || requesting}
                px={5}
                onClick={async () => {
                  setRequesting(true);
                  try {
                    typeof confirmCb.current === 'function' && (await confirmCb.current());
                    onClose();
                  } catch (error) {}
                  setRequesting(false);
                }}
              >
                {countDownAmount > 0 ? `${countDownAmount}s` : confirmText}
              </Button>
            </ModalFooter>
          )}
        </MyModal>
      );
    },
    [customContent, hideFooter, iconSrc, isOpen, map.bg, onClose, showCancel, t, title]
  );

  return {
    openConfirm,
    onClose,
    ConfirmModal
  };
};
