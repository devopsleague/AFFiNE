import type { WorkspaceServerService } from '@affine/core/modules/cloud';
import {
  addWorkspaceEmbeddingFilesMutation,
  getWorkspaceConfigQuery,
  getWorkspaceEmbeddingFilesQuery,
  getWorkspaceEmbeddingIgnoredDocsQuery,
  type PaginationInput,
  removeWorkspaceEmbeddingFilesMutation,
  setEnableDocEmbeddingMutation,
  updateWorkspaceEmbeddingIgnoredDocsMutation,
} from '@affine/graphql';
import { LiveData, Store } from '@toeverything/infra';

export class EmbeddingStore extends Store {
  private readonly _enabled$ = new LiveData<boolean>(false);

  constructor(private readonly workspaceServerService: WorkspaceServerService) {
    super();
  }

  get enabled() {
    return this._enabled$.value;
  }

  async getEnabled(workspaceId: string, signal?: AbortSignal) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }
    const data = await this.workspaceServerService.server.gql({
      query: getWorkspaceConfigQuery,
      variables: {
        id: workspaceId,
      },
      context: {
        signal,
      },
    });
    return data.workspace;
  }

  async updateEnabled(
    workspaceId: string,
    enabled: boolean,
    signal?: AbortSignal
  ) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }
    await this.workspaceServerService.server.gql({
      query: setEnableDocEmbeddingMutation,
      variables: {
        id: workspaceId,
        enableDocEmbedding: enabled,
      },
      context: {
        signal,
      },
    });
  }

  async getIgnoredDocs(
    workspaceId: string,
    pagination: PaginationInput,
    signal?: AbortSignal
  ) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }

    const data = await this.workspaceServerService.server.gql({
      query: getWorkspaceEmbeddingIgnoredDocsQuery,
      variables: {
        workspaceId,
        pagination,
      },
      context: { signal },
    });
    return data.workspace.embedding.ignoredDocs;
  }

  async updateIgnoredDocs(
    workspaceId: string,
    add: string[],
    remove: string[],
    signal?: AbortSignal
  ) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }

    await this.workspaceServerService.server.gql({
      query: updateWorkspaceEmbeddingIgnoredDocsMutation,
      variables: {
        workspaceId,
        add,
        remove,
      },
      context: { signal },
    });
  }

  async addEmbeddingFile(
    workspaceId: string,
    blob: File,
    signal?: AbortSignal
  ) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }

    await this.workspaceServerService.server.gql({
      query: addWorkspaceEmbeddingFilesMutation,
      variables: {
        workspaceId,
        blob,
      },
      context: { signal },
    });
  }

  async addEmbeddingFiles(
    workspaceId: string,
    files: File[],
    signal?: AbortSignal
  ) {
    for (const file of files) {
      await this.addEmbeddingFile(workspaceId, file, signal);
    }
  }

  async removeEmbeddingFile(
    workspaceId: string,
    fileId: string,
    signal?: AbortSignal
  ) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }

    await this.workspaceServerService.server.gql({
      query: removeWorkspaceEmbeddingFilesMutation,
      variables: {
        workspaceId,
        fileId,
      },
      context: { signal },
    });
  }

  async removeEmbeddingFiles(
    workspaceId: string,
    fileIds: string[],
    signal?: AbortSignal
  ) {
    for (const fileId of fileIds) {
      await this.removeEmbeddingFile(workspaceId, fileId, signal);
    }
  }

  async getEmbeddingFiles(
    workspaceId: string,
    pagination: PaginationInput,
    signal?: AbortSignal
  ) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }

    const data = await this.workspaceServerService.server.gql({
      query: getWorkspaceEmbeddingFilesQuery,
      variables: {
        workspaceId,
        pagination,
      },
      context: { signal },
    });
    return data.workspace.embedding.files;
  }
}
