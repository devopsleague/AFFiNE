import { Pagination } from '@affine/component/setting-components';
import { getAttachmentFileIconRC } from '@blocksuite/affine/components/icons';
import { CloseIcon } from '@blocksuite/icons/rc';
import { useCallback } from 'react';

import { COUNT_PER_PAGE } from '../constants';
import type { AttachmentFile } from '../types';
import {
  attachmentItem,
  attachmentOperation,
  attachmentsWrapper,
  attachmentTitle,
} from './styles.css';

interface AttachmentsProps {
  attachments: AttachmentFile[];
  totalCount: number;
  onPageChange: (offset: number) => void;
  onDelete: (id: string) => void;
}

interface AttachmentItemProps {
  attachment: AttachmentFile;
  onDelete: (id: string) => void;
}

const AttachmentItem: React.FC<AttachmentItemProps> = ({
  attachment,
  onDelete,
}) => {
  const handleDelete = useCallback(() => {
    onDelete(attachment.fileId);
  }, [onDelete, attachment.fileId]);

  const Icon = getAttachmentFileIconRC(attachment.mimeType);
  return (
    <div className={attachmentItem}>
      <div className={attachmentTitle}>
        <Icon style={{ marginRight: 4 }} /> {attachment.fileName}
      </div>
      <div className={attachmentOperation}>
        <CloseIcon onClick={handleDelete} />
      </div>
    </div>
  );
};

export const Attachments: React.FC<AttachmentsProps> = ({
  attachments,
  totalCount,
  onDelete,
  onPageChange,
}) => {
  const handlePageChange = useCallback(
    (offset: number) => {
      onPageChange(offset);
    },
    [onPageChange]
  );

  return (
    <div className={attachmentsWrapper}>
      {attachments.map(attachment => (
        <AttachmentItem
          key={attachment.fileId}
          attachment={attachment}
          onDelete={onDelete}
        />
      ))}
      <Pagination
        totalCount={totalCount}
        countPerPage={COUNT_PER_PAGE}
        onPageChange={handlePageChange}
      />
    </div>
  );
};
