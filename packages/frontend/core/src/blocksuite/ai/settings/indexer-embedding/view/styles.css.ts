import { cssVar } from '@toeverything/theme';
import { style } from '@vanilla-extract/css';

export const indexerMenuTrigger = style({
  textTransform: 'capitalize',
  fontWeight: 600,
  width: '250px',
});

export const attachmentsWrapper = style({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  alignItems: 'center',
  padding: '8px',
  gap: '4px',
  isolation: 'isolate',
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: '8px',
  flexGrow: 0,
  marginBottom: '16px',
});

export const attachmentItem = style({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '4px',
  gap: '4px',
  border: `0.5px solid ${cssVar('borderColor')}`,
  borderRadius: '4px',
  flex: 'none',
  alignSelf: 'stretch',
  flexGrow: 0,
});

export const attachmentTitle = style({
  fontSize: '14px',
  fontWeight: 400,
  color: cssVar('textPrimaryColor'),
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
});

export const attachmentOperation = style({
  display: 'flex',
  alignItems: 'center',
});

export const excludeDocsWrapper = style({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  alignItems: 'center',
  padding: '8px',
  gap: '4px',
  isolation: 'isolate',
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: '8px',
  flexGrow: 0,
  marginBottom: '8px',
});

export const docItem = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  alignSelf: 'stretch',
});

export const docItemTitle = style({
  fontSize: '14px',
  fontWeight: 500,
  color: cssVar('textPrimaryColor'),
  display: 'flex',
  alignItems: 'center',
});

export const docItemInfo = style({
  display: 'flex',
  fontSize: '12px',
  fontWeight: 400,
  color: cssVar('textSecondaryColor'),
  gap: '12px',
  alignItems: 'center',
});
