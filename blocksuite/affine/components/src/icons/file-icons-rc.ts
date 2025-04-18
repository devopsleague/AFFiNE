import {
  ImageIcon,
  FileIconJpegIcon,
  FileIconPngIcon,
  FileIconWebpIcon,
  FileIconTiffIcon,
  FileIconGifIcon,
  FileIconSvgIcon,
  FileIconEpsIcon,
  FileIconPdfIcon,
  FileIconDocxIcon,
  FileIconTxtIcon,
  FileIconCsvIcon,
  FileIconDocIcon,
  FileIconXlsIcon,
  FileIconXlsxIcon,
  FileIconPptIcon,
  FileIconPptxIcon,
  FileIconAiIcon,
  FileIconPsdIcon,
  FileIconInddIcon,
  FileIconAepIcon,
  FileIconFigIcon,
  FileIconMp3Icon,
  FileIconWavIcon,
  FileIconMpegIcon,
  FileIconAviIcon,
  FileIconMp4Icon,
  FileIconMkvIcon,
  FileIconHtmlIcon,
  FileIconRssIcon,
  FileIconSqlIcon,
  FileIconJsIcon,
  FileIconCssIcon,
  FileIconJavaIcon,
  FileIconXmlIcon,
  FileIconDmgIcon,
  FileIconZipIcon,
  FileIconRarIcon,
  FileIconExeIcon,
  FileIconJsonIcon,
  FileIconNoneIcon,
} from '@blocksuite/icons/rc';

export function getAttachmentFileIconRC(filetype: string) {
  switch (filetype) {
    case 'img':
      return ImageIcon;
    case 'jpg':
      return FileIconJpegIcon;
    case 'jpeg':
      return FileIconJpegIcon;
    case 'png':
      return FileIconPngIcon;
    case 'webp':
      return FileIconWebpIcon;
    case 'tiff':
      return FileIconTiffIcon;
    case 'gif':
      return FileIconGifIcon;
    case 'svg':
      return FileIconSvgIcon;
    case 'eps':
      return FileIconEpsIcon;
    case 'pdf':
      return FileIconPdfIcon;
    case 'doc':
      return FileIconDocIcon;
    case 'docx':
      return FileIconDocxIcon;
    case 'txt':
      return FileIconTxtIcon;
    case 'csv':
      return FileIconCsvIcon;
    case 'xls':
      return FileIconXlsIcon;
    case 'xlsx':
      return FileIconXlsxIcon;
    case 'ppt':
      return FileIconPptIcon;
    case 'pptx':
      return FileIconPptxIcon;
    case 'fig':
      return FileIconFigIcon;
    case 'ai':
      return FileIconAiIcon;
    case 'psd':
      return FileIconPsdIcon;
    case 'indd':
      return FileIconInddIcon;
    case 'aep':
      return FileIconAepIcon;
    case 'mp3':
      return FileIconMp3Icon;
    case 'wav':
      return FileIconWavIcon;
    case 'mp4':
      return FileIconMp4Icon;
    case 'mpeg':
      return FileIconMpegIcon;
    case 'avi':
      return FileIconAviIcon;
    case 'mkv':
      return FileIconMkvIcon;
    case 'html':
      return FileIconHtmlIcon;
    case 'css':
      return FileIconCssIcon;
    case 'rss':
      return FileIconRssIcon;
    case 'sql':
      return FileIconSqlIcon;
    case 'js':
      return FileIconJsIcon;
    case 'json':
      return FileIconJsonIcon;
    case 'java':
      return FileIconJavaIcon;
    case 'xml':
      return FileIconXmlIcon;
    case 'exe':
      return FileIconExeIcon;
    case 'dmg':
      return FileIconDmgIcon;
    case 'zip':
      return FileIconZipIcon;
    case 'rar':
      return FileIconRarIcon;
    default:
      return FileIconNoneIcon;
  }
}
