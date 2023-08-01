import {basename} from 'node:path';
import * as path from 'path';
import * as mime from 'mime-types';

const fetch = (await import('node-fetch')).default;
import {blobFromSync, FormData} from 'node-fetch';

export interface JSONResponse {
  status?: number,
  data: { id: number },
  error?: { status: number }
}

export interface FileUploadFormat {
  hash: string,
  ext: string,
  mime: string,
  size: number,
  url: string,
  name: string,
  width: number,
  height: number
}

export interface FileUploadResponse extends FileUploadFormat {
  id: number,
  alternativeText: any,
  caption: any,
  formats: { small: FileUploadFormat, medium: FileUploadFormat, thumbnail: FileUploadFormat }
  previewUrl: string,
  provider: string,
  provider_metadata: any,
  createdAt: Date
  updatedAt: Date,
}

export interface MediaFolderCreation {
  data: { id: number }
}

export class StrapiClient {
  private readonly apiBaseUrl;
  private schedulerPlugin?: "@webbio-strapi-plugin-scheduler" | "strapi-plugin-publisher";

  constructor(private strapiBaseUrl: string, private token: string, private adminToken?: string) {
    this.apiBaseUrl = path.join(strapiBaseUrl, 'api');
  }

  configureScheduler(plugin: '@webbio-strapi-plugin-scheduler' | 'strapi-plugin-publisher') {
    this.schedulerPlugin = plugin;
  }

  async createEntry<T>(apiId: string, data: T): Promise<JSONResponse> {
    return await (await fetch(`${this.apiBaseUrl}/${apiId}`, {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: data
      })
    })).json() as JSONResponse
  }

  async updateEntry<T>(apiId: string, id: string | number, data: Partial<T>): Promise<JSONResponse> {
    return await (await fetch(`${this.apiBaseUrl}/${apiId}/${id}`, {
      method: 'put',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: data
      })
    })).json() as JSONResponse
  }

  async addMediaAsset(assetPathOrUrl: string, alt?: string, caption?: string): Promise<FileUploadResponse[]> {
    const blob = /^http(s)?:\/\//.test(assetPathOrUrl)
      ? await (await fetch(assetPathOrUrl)).blob()
      : blobFromSync(assetPathOrUrl, mime.lookup(assetPathOrUrl) as string);
    const form = new FormData();
    form.append('files', blob, basename(assetPathOrUrl));
    form.append('fileInfo', JSON.stringify({
      alternativeText: alt,
      caption: caption
    }));
    return await (await fetch(`${this.apiBaseUrl}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: form
    })).json() as FileUploadResponse[]
  }

  async createMediaFolder(folderName: string, parentId: number | null = null): Promise<MediaFolderCreation> {
    if (!this.adminToken) throw new Error('You must specify an admin token for media folder creation');
    return await (await fetch(`${this.strapiBaseUrl}/upload/folders/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        parent: parentId
      })
    })).json() as MediaFolderCreation;
  }

  async moveMedia(folderId: number, mediaIds: number[]): Promise<void> {
    if (!this.adminToken) throw new Error('You must specify an admin token for media folder creation');
    await fetch(`${this.strapiBaseUrl}/upload/actions/bulk-move`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destinationFolderId: folderId,
        fileIds: mediaIds
      })
    });
  }

  async addPublishDate(contentType: string, id: number, date: Date): Promise<void> {
    return this._addPublisherDate(true, contentType, id, date);
  }

  async addUnpublishDate(contentType: string, id: number, date: Date): Promise<void> {
    return this._addPublisherDate(false, contentType, id, date);
  }

  private async _addPublisherDate(publish: boolean, contentType: string, id: number, date: Date): Promise<void> {
    if (!this.schedulerPlugin) throw new Error('You must specify a scheduler plugin in configureScheduler()');
    if (!this.adminToken) throw new Error('You must specify an admin token for adding a (un)publish date');
    const body = {
      '@webbio-strapi-plugin-scheduler': {
        contentId: id,
        uid: `api::${contentType}.${contentType}`,
        scheduledDatetime: date,
        scheduleType: publish ? 'schedule' : 'depublish',
      },
      'strapi-plugin-publisher': {
        data: {
          entityId: id,
          entitySlug: `api::${contentType}.${contentType}`,
          executeAt: date,
          mode: publish ? 'publish' : 'unpublish',
        }
      }
    }[this.schedulerPlugin];
    const urlPath = {
      '@webbio-strapi-plugin-scheduler': 'scheduler/create',
      'strapi-plugin-publisher': 'publisher/actions'
    }[this.schedulerPlugin];
    await fetch(`${this.strapiBaseUrl}/${urlPath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
  }
}
