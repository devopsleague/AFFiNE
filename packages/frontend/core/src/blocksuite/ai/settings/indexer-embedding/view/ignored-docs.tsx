import { Avatar } from '@affine/component';
import { Pagination } from '@affine/component/setting-components';
import React, { useCallback } from 'react';

import type { IgnoredDoc } from '../types';
import {
  docItem,
  docItemInfo,
  docItemTitle,
  excludeDocsWrapper,
} from './styles.css';

interface IgnoredDocsProps {
  ignoredDocs: IgnoredDoc[];
  totalCount: number;
  onPageChange: (offset: number) => void;
}

interface DocItemProps {
  doc: IgnoredDoc;
}

const DocItem: React.FC<DocItemProps> = ({ doc }) => {
  return (
    <div className={docItem}>
      <div className={docItemTitle}>{doc.docId}</div>
      {/* <div className={docItemInfo}>
        <span>{doc.createdAt}</span>
        <Avatar name={doc.userName} url={doc.userAvatar} />
      </div> */}
    </div>
  );
};

export const IgnoredDocs: React.FC<IgnoredDocsProps> = ({
  ignoredDocs,
  totalCount,
  onPageChange,
}) => {
  const handlePageChange = useCallback(
    (offset: number) => {
      onPageChange(offset);
    },
    [onPageChange]
  );

  return (
    <div className={excludeDocsWrapper}>
      {ignoredDocs.map(doc => (
        <DocItem key={doc.docId} doc={doc} />
      ))}

      <Pagination
        totalCount={totalCount}
        countPerPage={10}
        onPageChange={handlePageChange}
      />
    </div>
  );
};
