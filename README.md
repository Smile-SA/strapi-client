# strapi-client

[![NPM version](https://img.shields.io/npm/v/@smile/strapi-client)](https://www.npmjs.com/package/@smile/strapi-client)

An HTTP client for Strapi focused on content and media creation (for mass data migration from another CMS/datasource).

While other clients may exist, this one is focused on content and media creation with possibility to create Media directories and moving media in directories.

## Usage

In your migration project.

### Add the dependency

```shell
npm i -D @smile/strapi-client
```

### Create an HTTP client instance

```javascript
import {StrapiClient} from '@smile/strapi-client';
const strapiClient = new StrapiClient('http://127.0.0.1:1337', 'token', 'admin_token');
```

- `'token'` is an API token that you must create in Strapi. The token must have enough access (e.g.: "Full access") to be able to create the required content.
- `'admin_token'` is optional (for creating media folders or moving media in the Media Library) and must be a JWT token (check in your browser local storage after authenticating to Strapi admin). The user associated to that JWT token must have enough rights to manage the Media Library.

### Use the API

Examples below are based on [FoodAdvisor](https://github.com/strapi/foodadvisor) Strapi demo.

#### Create an entry

```javascript
await strapiClient.createEntry('articles', {
    title: '5 Famous Restaurants You Have to Visit in Paris',
    ckeditor_content: `<div class="entry-content">
<h3>As one of the top food destinations in the world, there’s no shortage of famous restaurants in Paris.</h3>
<p>From historic addresses to those made famous by celebrity diners, here we round up some of the most iconic Paris restaurants that are actually worth a visit.&nbsp;</p>`
});
```

#### Create a media

```javascript
const mediaCreationResponse = await strapiClient.addMediaAsset('https://assets2.devourtours.com/wp-content/uploads/famous-restaurants-in-paris-1.png', 'Some of the most famous restaurants in Paris have gotten quite touristy and aren\'t really worth your time. Here are five that fortunately manage to stay authentic in the face of mass tourism.', 'Photo Credit: Hirama for Tour d’Argent');
```

#### Create a media folder

```javascript
const mediaFolderCreationResponse = await strapiClient.createMediaFolder('Famous restaurants');
```

#### Move media to a folder

```javascript
await strapiClient.moveMedia(mediaFolderCreationResponse.data.id, [mediaCreationResponse[0].id]);
```

#### Update an entry

```javascript
await strapiClient.updateEntry('articles', creationResponse.data.id, {
  publicationState: 'In review',
  image: mediaCreationResponse[0].id
});
```
