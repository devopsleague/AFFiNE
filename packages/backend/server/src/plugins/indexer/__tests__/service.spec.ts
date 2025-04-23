import { randomUUID } from 'node:crypto';
import { mock } from 'node:test';

import test from 'ava';

import { createModule } from '../../../__tests__/create-module';
import { Mockers } from '../../../__tests__/mocks';
import { ServerConfigModule } from '../../../core/config';
import { IndexerModule, IndexerService } from '..';
import { SearchProviderName } from '../config';
import { SearchProviderFactory } from '../factory';
import { ElasticsearchProvider, ManticoresearchProvider } from '../providers';
import { SearchTable } from '../tables';
import {
  AggregateInput,
  SearchInput,
  SearchQueryOccur,
  SearchQueryType,
} from '../types';

const module = await createModule({
  imports: [IndexerModule, ServerConfigModule],
  providers: [IndexerService],
});
const indexerService = module.get(IndexerService);
const searchProviderFactory = module.get(SearchProviderFactory);
const manticoresearch = module.get(ManticoresearchProvider);
const elasticsearch = module.get(ElasticsearchProvider);
const user = await module.create(Mockers.User);
const workspace = await module.create(Mockers.Workspace);
const providerName =
  process.env.AFFINE_INDEXER_SEARCH_PROVIDER ??
  SearchProviderName.Manticoresearch;
const isManticoresearch = providerName === SearchProviderName.Manticoresearch;
const searchProvider = isManticoresearch ? manticoresearch : elasticsearch;
const docSort = isManticoresearch
  ? ['_score', { updated_at: 'desc' }, 'id']
  : ['_score', { updated_at: 'desc' }, 'doc_id'];
const blockSort = isManticoresearch
  ? ['_score', { updated_at: 'desc' }, 'id']
  : ['_score', { updated_at: 'desc' }, 'doc_id', 'block_id'];

mock.method(searchProviderFactory, 'get', () => {
  return searchProvider;
});

test.after.always(async () => {
  await module.close();
});

test.before(async () => {
  await indexerService.createTables();
});

test.afterEach.always(async () => {
  await indexerService.deleteByQuery(
    SearchTable.doc,
    {
      type: SearchQueryType.match,
      field: 'workspaceId',
      match: workspace.id,
    },
    {
      refresh: true,
    }
  );
  await indexerService.deleteByQuery(
    SearchTable.block,
    {
      type: SearchQueryType.match,
      field: 'workspaceId',
      match: workspace.id,
    },
    {
      refresh: true,
    }
  );
});

// #region write()

test('should write throw error when field type wrong', async t => {
  await t.throwsAsync(
    indexerService.write(SearchTable.block, [
      {
        workspaceId: workspace.id,
        docId: 'docId1',
        blockId: randomUUID(),
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        content: 'hello world',
        flavour: 'affine:page',
        // @ts-expect-error test error
        refDocId: 123,
      },
    ]),
    {
      message: /ref_doc_id/,
    }
  );
});

test('should write block with array content work', async t => {
  const docId = randomUUID();
  const blockId = randomUUID();
  await indexerService.write(
    SearchTable.block,
    [
      {
        workspaceId: workspace.id,
        docId,
        blockId,
        content: ['hello', 'world'],
        flavour: 'affine:page',
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );
  const result = await indexerService.search({
    table: SearchTable.block,
    query: {
      type: SearchQueryType.boolean,
      occur: SearchQueryOccur.must,
      queries: [
        {
          type: SearchQueryType.match,
          field: 'workspaceId',
          match: workspace.id,
        },
        {
          type: SearchQueryType.match,
          field: 'content',
          match: 'hello world',
        },
      ],
    },
    options: {
      fields: ['content'],
    },
  });
  t.is(result.total, 1);
  t.is(result.nodes.length, 1);
  if (isManticoresearch) {
    t.deepEqual(result.nodes[0].fields, {
      content: ['hello world'],
    });
  } else {
    t.deepEqual(result.nodes[0].fields, {
      content: ['hello', 'world'],
    });
  }
});

test('should write 10k docs work', async t => {
  const docCount = 10000;
  const docs = [];
  for (let i = 0; i < docCount; i++) {
    docs.push({
      workspaceId: workspace.id,
      docId: randomUUID(),
      title: `hello world ${i} ${randomUUID()}`,
      summary: `this is a test ${i} ${randomUUID()}`,
      createdByUserId: user.id,
      updatedByUserId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  await indexerService.write(SearchTable.doc, docs);
  // cleanup
  await indexerService.deleteByQuery(
    SearchTable.doc,
    {
      type: SearchQueryType.match,
      field: 'workspaceId',
      match: workspace.id,
    },
    {
      refresh: true,
    }
  );
  t.pass();
});

test('should write ref as string[] work', async t => {
  const docIds = [randomUUID(), randomUUID(), randomUUID()];
  await indexerService.write(
    SearchTable.block,
    [
      {
        docId: docIds[0],
        workspaceId: workspace.id,
        content: 'test1',
        flavour: 'markdown',
        blockId: randomUUID(),
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date('2025-04-22T00:00:00.000Z'),
        updatedAt: new Date('2025-04-22T00:00:00.000Z'),
      },
      {
        docId: docIds[1],
        workspaceId: workspace.id,
        content: 'test2',
        flavour: 'markdown',
        blockId: randomUUID(),
        refDocId: [docIds[0]],
        ref: ['{"foo": "bar1"}'],
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date('2021-04-22T00:00:00.000Z'),
        updatedAt: new Date('2021-04-22T00:00:00.000Z'),
      },
      {
        docId: docIds[2],
        workspaceId: workspace.id,
        content: 'test3',
        flavour: 'markdown',
        blockId: randomUUID(),
        refDocId: [docIds[0], docIds[2]],
        ref: ['{"foo": "bar1"}', '{"foo": "bar3"}'],
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date('2025-03-22T00:00:00.000Z'),
        updatedAt: new Date('2025-03-22T00:00:00.000Z'),
      },
      {
        docId: docIds[0],
        workspaceId: workspace.id,
        content: 'test4',
        flavour: 'markdown',
        blockId: randomUUID(),
        refDocId: [docIds[0], docIds[2]],
        ref: ['{"foo": "bar1"}', '{"foo": "bar3"}'],
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date('2025-04-22T00:00:00.000Z'),
        updatedAt: new Date('2025-04-22T00:00:00.000Z'),
      },
    ],
    {
      refresh: true,
    }
  );
  t.pass();
});

// #endregion

// #region parseInput()

test('should parse all query work', async t => {
  const input = {
    table: SearchTable.block,
    query: { type: SearchQueryType.all },
    options: {
      fields: ['flavour', 'docId', 'refDocId'],
    },
  };
  const result = indexerService.parseInput(input);
  t.deepEqual(result, {
    _source: ['workspace_id', 'doc_id'],
    sort: blockSort,
    query: {
      match_all: {},
    },
    fields: ['flavour', 'doc_id', 'ref_doc_id'],
  });
});

test('should parse exists query work', async t => {
  const input = {
    table: SearchTable.block,
    query: { type: SearchQueryType.exists, field: 'refDocId' },
    options: {
      fields: ['flavour', 'docId', 'refDocId'],
    },
  };
  const result = indexerService.parseInput(input);
  t.deepEqual(result, {
    _source: ['workspace_id', 'doc_id'],
    sort: blockSort,
    query: {
      exists: {
        field: 'ref_doc_id',
      },
    },
    fields: ['flavour', 'doc_id', 'ref_doc_id'],
  });
});

test('should parse boost query work', async t => {
  const input = {
    table: SearchTable.block,
    query: {
      type: SearchQueryType.boost,
      boost: 1.5,
      query: {
        type: SearchQueryType.match,
        field: 'flavour',
        match: 'affine:page',
      },
    },
    options: {
      fields: ['flavour', 'docId', 'refDocId'],
    },
  };
  const result = indexerService.parseInput(input);
  t.deepEqual(result, {
    _source: ['workspace_id', 'doc_id'],
    sort: blockSort,
    query: {
      match: {
        flavour: {
          query: 'affine:page',
          boost: 1.5,
        },
      },
    },
    fields: ['flavour', 'doc_id', 'ref_doc_id'],
  });
});

test('should parse match query work', async t => {
  const input = {
    table: SearchTable.block,
    query: {
      type: SearchQueryType.match,
      field: 'flavour',
      match: 'affine:page',
    },
    options: {
      fields: [
        'flavour',
        'docId',
        'refDocId',
        'parentFlavour',
        'parentBlockId',
        'additional',
        'markdownPreview',
        'createdByUserId',
        'updatedByUserId',
        'createdAt',
        'updatedAt',
      ],
    },
  };
  const result = indexerService.parseInput(input);
  t.deepEqual(result, {
    _source: ['workspace_id', 'doc_id'],
    sort: blockSort,
    query: {
      match: {
        flavour: {
          query: 'affine:page',
        },
      },
    },
    fields: [
      'flavour',
      'doc_id',
      'ref_doc_id',
      'parent_flavour',
      'parent_block_id',
      'additional',
      'markdown_preview',
      'created_by_user_id',
      'updated_by_user_id',
      'created_at',
      'updated_at',
    ],
  });
});

test('should parse boolean query work', async t => {
  const input = {
    table: SearchTable.block,
    query: {
      type: 'boolean',
      occur: 'must',
      queries: [
        {
          type: 'match',
          field: 'workspaceId',
          match: 'workspaceId1',
        },
        {
          type: 'match',
          field: 'content',
          match: 'hello',
        },
        {
          type: 'boolean',
          occur: 'should',
          queries: [
            {
              type: 'match',
              field: 'content',
              match: 'hello',
            },
            {
              type: 'boost',
              boost: 1.5,
              query: {
                type: 'match',
                field: 'flavour',
                match: 'affine:page',
              },
            },
          ],
        },
      ],
    },
    options: {
      fields: [
        'flavour',
        'docId',
        'refDocId',
        'parentFlavour',
        'parentBlockId',
        'additional',
        'markdownPreview',
        'createdByUserId',
        'updatedByUserId',
        'createdAt',
        'updatedAt',
      ],
    },
  };
  const result = indexerService.parseInput(input as SearchInput);
  t.deepEqual(result, {
    _source: ['workspace_id', 'doc_id'],
    sort: blockSort,
    query: {
      bool: {
        must: [
          {
            match: {
              workspace_id: {
                query: 'workspaceId1',
              },
            },
          },
          {
            match: {
              content: {
                query: 'hello',
              },
            },
          },
          {
            bool: {
              should: [
                {
                  match: {
                    content: {
                      query: 'hello',
                    },
                  },
                },
                {
                  match: {
                    flavour: {
                      query: 'affine:page',
                      boost: 1.5,
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
    fields: [
      'flavour',
      'doc_id',
      'ref_doc_id',
      'parent_flavour',
      'parent_block_id',
      'additional',
      'markdown_preview',
      'created_by_user_id',
      'updated_by_user_id',
      'created_at',
      'updated_at',
    ],
  });
});

test('should parse search input highlight work', async t => {
  const input = {
    table: SearchTable.block,
    query: {
      type: SearchQueryType.all,
    },
    options: {
      fields: ['flavour', 'docId', 'refDocId'],
      highlights: [{ field: 'content', before: '<b>', end: '</b>' }],
    },
  };
  const result = indexerService.parseInput(input as SearchInput);
  t.deepEqual(result, {
    _source: ['workspace_id', 'doc_id'],
    sort: blockSort,
    query: {
      match_all: {},
    },
    highlight: {
      fields: {
        content: {
          pre_tags: ['<b>'],
          post_tags: ['</b>'],
        },
      },
    },
    fields: ['flavour', 'doc_id', 'ref_doc_id'],
  });
});

test('should parse aggregate input highlight work', async t => {
  const input = {
    table: SearchTable.doc,
    field: 'flavour',
    query: {
      type: SearchQueryType.all,
    },
    options: {
      hits: {
        fields: ['flavour', 'docId', 'refDocId'],
        highlights: [{ field: 'content', before: '<b>', end: '</b>' }],
      },
    },
  };
  const result = indexerService.parseInput(input as AggregateInput);
  t.deepEqual(result, {
    _source: ['workspace_id', 'doc_id'],
    sort: docSort,
    query: {
      match_all: {},
    },
    aggs: {
      result: {
        terms: {
          field: 'flavour',
        },
        aggs: {
          result: {
            top_hits: {
              _source: ['workspace_id', 'doc_id'],
              highlight: {
                fields: {
                  content: {
                    pre_tags: ['<b>'],
                    post_tags: ['</b>'],
                  },
                },
              },
              fields: ['flavour', 'doc_id', 'ref_doc_id'],
            },
          },
        },
      },
    },
  });
});

// #endregion

// #region search()

test('should search work', async t => {
  const docId1 = randomUUID();
  const docId2 = randomUUID();
  await indexerService.write(
    SearchTable.doc,
    [
      {
        workspaceId: workspace.id,
        title: 'hello world',
        summary: 'this is a test',
        docId: docId1,
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        workspaceId: workspace.id,
        title: '你好世界',
        summary: '这是测试',
        docId: docId2,
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );
  let result = await indexerService.search({
    table: SearchTable.doc,
    query: {
      type: SearchQueryType.boolean,
      occur: SearchQueryOccur.must,
      queries: [
        {
          type: SearchQueryType.match,
          field: 'workspaceId',
          match: workspace.id,
        },
        {
          type: SearchQueryType.match,
          field: 'title',
          match: 'hello hello',
        },
      ],
    },
    options: {
      fields: ['workspaceId', 'docId', 'title', 'summary'],
      highlights: [{ field: 'title', before: '<b>', end: '</b>' }],
    },
  });
  // console.log(JSON.stringify(result, null, 2));
  t.truthy(result.nextCursor);
  t.is(result.total, 1);
  t.is(result.nodes.length, 1);
  t.deepEqual(result.nodes[0].fields, {
    workspaceId: [workspace.id],
    docId: [docId1],
    title: ['hello world'],
    summary: ['this is a test'],
  });
  t.deepEqual(result.nodes[0].highlights, {
    title: ['<b>hello</b> world'],
  });
  t.deepEqual(result.nodes[0]._source, {
    workspaceId: workspace.id,
    docId: docId1,
  });

  result = await indexerService.search({
    table: SearchTable.doc,
    query: {
      type: SearchQueryType.boolean,
      occur: SearchQueryOccur.must,
      queries: [
        {
          type: SearchQueryType.match,
          field: 'workspaceId',
          match: workspace.id,
        },
        {
          type: SearchQueryType.match,
          field: 'title',
          match: '你好你好',
        },
      ],
    },
    options: {
      fields: ['workspaceId', 'docId', 'title', 'summary'],
      highlights: [{ field: 'title', before: '<b>', end: '</b>' }],
    },
  });
  // console.log(JSON.stringify(result, null, 2));
  t.truthy(result.nextCursor);
  t.is(result.total, 1);
  t.is(result.nodes.length, 1);
  t.deepEqual(result.nodes[0].fields, {
    workspaceId: [workspace.id],
    docId: [docId2],
    title: ['你好世界'],
    summary: ['这是测试'],
  });
  if (isManticoresearch) {
    t.deepEqual(result.nodes[0].highlights, {
      title: ['<b>你好</b> 世界'],
    });
  } else {
    t.deepEqual(result.nodes[0].highlights, {
      title: ['<b>你</b><b>好</b>世界'],
    });
  }
  t.deepEqual(result.nodes[0]._source, {
    workspaceId: workspace.id,
    docId: docId2,
  });
});

test('should throw error when limit is greater than 10000', async t => {
  await t.throwsAsync(
    indexerService.search({
      table: SearchTable.doc,
      query: {
        type: SearchQueryType.all,
      },
      options: {
        fields: ['workspaceId', 'docId', 'title', 'summary'],
        pagination: {
          limit: 10001,
        },
      },
    }),
    {
      message: 'Invalid indexer input: limit must be less than 10000',
    }
  );
});

// #endregion

// #region aggregate()

test('should aggregate work', async t => {
  const docId1 = randomUUID();
  const docId2 = randomUUID();
  const blockId1 = randomUUID();
  const blockId2 = randomUUID();
  const blockId3 = randomUUID();
  await indexerService.write(
    SearchTable.block,
    [
      {
        workspaceId: workspace.id,
        flavour: 'affine:page',
        docId: docId1,
        blockId: blockId3,
        content: 'hello world, this is a title',
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        workspaceId: workspace.id,
        flavour: 'affine:text',
        docId: docId1,
        blockId: blockId1,
        content: 'hello world, this is a block',
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        workspaceId: workspace.id,
        flavour: 'affine:text',
        docId: docId2,
        blockId: blockId2,
        content: 'hello world, this is a test block',
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );
  const result = await indexerService.aggregate({
    table: SearchTable.block,
    field: 'docId',
    query: {
      type: SearchQueryType.boolean,
      occur: SearchQueryOccur.must,
      queries: [
        {
          type: SearchQueryType.match,
          field: 'workspaceId',
          match: workspace.id,
        },
        {
          type: SearchQueryType.boolean,
          occur: SearchQueryOccur.should,
          queries: [
            {
              type: SearchQueryType.match,
              field: 'content',
              match: 'hello',
            },
            {
              type: SearchQueryType.boolean,
              occur: SearchQueryOccur.should,
              queries: [
                {
                  type: SearchQueryType.match,
                  field: 'content',
                  match: 'hello',
                },
                {
                  type: SearchQueryType.boost,
                  boost: 1.5,
                  query: {
                    type: SearchQueryType.match,
                    field: 'flavour',
                    match: 'affine:page',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    options: {
      hits: {
        fields: ['workspaceId', 'docId', 'blockId', 'content', 'flavour'],
        highlights: [{ field: 'content', before: '<b>', end: '</b>' }],
      },
    },
  });
  t.is(result.total, 3);
  t.is(result.buckets.length, 2);
  t.deepEqual(result.buckets[0].key, docId1);
  t.is(result.buckets[0].count, 2);
  // match affine:page first
  t.deepEqual(result.buckets[0].hits.nodes[0].fields, {
    workspaceId: [workspace.id],
    docId: [docId1],
    blockId: [blockId3],
    content: ['hello world, this is a title'],
    flavour: ['affine:page'],
  });
  t.deepEqual(result.buckets[0].hits.nodes[0].highlights, {
    content: ['<b>hello</b> world, this is a title'],
  });
  t.deepEqual(result.buckets[0].hits.nodes[0]._source, {
    workspaceId: workspace.id,
    docId: docId1,
  });
  t.deepEqual(result.buckets[0].hits.nodes[1].fields, {
    workspaceId: [workspace.id],
    docId: [docId1],
    blockId: [blockId1],
    content: ['hello world, this is a block'],
    flavour: ['affine:text'],
  });
  t.deepEqual(result.buckets[0].hits.nodes[1].highlights, {
    content: ['<b>hello</b> world, this is a block'],
  });
  t.deepEqual(result.buckets[0].hits.nodes[1]._source, {
    workspaceId: workspace.id,
    docId: docId1,
  });
  t.deepEqual(result.buckets[1].key, docId2);
  t.is(result.buckets[1].count, 1);
  t.deepEqual(result.buckets[1].hits.nodes[0].fields, {
    workspaceId: [workspace.id],
    docId: [docId2],
    blockId: [blockId2],
    content: ['hello world, this is a test block'],
    flavour: ['affine:text'],
  });
  t.deepEqual(result.buckets[1].hits.nodes[0].highlights, {
    content: ['<b>hello</b> world, this is a test block'],
  });
  t.deepEqual(result.buckets[1].hits.nodes[0]._source, {
    workspaceId: workspace.id,
    docId: docId2,
  });
});

test('should throw error when field is not allowed in aggregate input', async t => {
  await t.throwsAsync(
    indexerService.aggregate({
      table: SearchTable.block,
      field: 'workspaceId',
      query: {
        type: SearchQueryType.all,
      },
      options: {
        hits: {
          fields: ['workspaceId', 'docId', 'blockId', 'content', 'flavour'],
        },
      },
    }),
    {
      message:
        'Invalid indexer input: aggregate field "workspaceId" is not allowed',
    }
  );
});

// #endregion

// #region deleteWorkspace()

test('should delete workspace work', async t => {
  const workspaceId = randomUUID();
  const docId1 = randomUUID();
  const docId2 = randomUUID();
  await indexerService.write(
    SearchTable.doc,
    [
      {
        workspaceId,
        docId: docId1,
        title: 'hello world',
        summary: 'this is a test',
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        workspaceId,
        docId: docId2,
        title: 'hello world',
        summary: 'this is a test',
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );
  await indexerService.write(
    SearchTable.block,
    [
      {
        workspaceId,
        docId: docId1,
        blockId: randomUUID(),
        content: 'hello world',
        flavour: 'affine:text',
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );

  let result = await indexerService.search({
    table: SearchTable.doc,
    query: {
      type: SearchQueryType.match,
      field: 'workspaceId',
      match: workspaceId,
    },
    options: {
      fields: ['workspaceId', 'docId', 'title', 'summary'],
    },
  });
  t.is(result.total, 2);
  t.is(result.nodes.length, 2);
  let result2 = await indexerService.search({
    table: SearchTable.block,
    query: {
      type: SearchQueryType.match,
      field: 'workspaceId',
      match: workspaceId,
    },
    options: {
      fields: ['workspaceId', 'docId', 'blockId', 'content', 'flavour'],
    },
  });
  t.is(result2.total, 1);
  t.is(result2.nodes.length, 1);

  await indexerService.deleteWorkspace(workspaceId, {
    refresh: true,
  });
  result = await indexerService.search({
    table: SearchTable.doc,
    query: {
      type: SearchQueryType.match,
      field: 'workspaceId',
      match: workspaceId,
    },
    options: {
      fields: ['workspaceId', 'docId', 'title', 'summary'],
    },
  });
  t.is(result.total, 0);
  t.is(result.nodes.length, 0);
  result2 = await indexerService.search({
    table: SearchTable.block,
    query: {
      type: SearchQueryType.match,
      field: 'workspaceId',
      match: workspaceId,
    },
    options: {
      fields: ['workspaceId', 'docId', 'blockId', 'content', 'flavour'],
    },
  });
  t.is(result2.total, 0);
  t.is(result2.nodes.length, 0);
});

// #endregion

// #region deleteDoc()

test('should delete doc work', async t => {
  const workspaceId = randomUUID();
  const docId1 = randomUUID();
  const docId2 = randomUUID();
  await indexerService.write(
    SearchTable.doc,
    [
      {
        workspaceId,
        docId: docId1,
        title: 'hello world',
        summary: 'this is a test',
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        workspaceId,
        docId: docId2,
        title: 'hello world',
        summary: 'this is a test',
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );
  await indexerService.write(
    SearchTable.block,
    [
      {
        workspaceId,
        docId: docId1,
        blockId: randomUUID(),
        content: 'hello world',
        flavour: 'affine:text',
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        workspaceId,
        docId: docId2,
        blockId: randomUUID(),
        content: 'hello world',
        flavour: 'affine:text',
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );

  let result1 = await indexerService.search({
    table: SearchTable.doc,
    query: {
      type: SearchQueryType.boolean,
      occur: SearchQueryOccur.must,
      queries: [
        {
          type: SearchQueryType.match,
          field: 'workspaceId',
          match: workspaceId,
        },
        {
          type: SearchQueryType.match,
          field: 'docId',
          match: docId1,
        },
      ],
    },
    options: {
      fields: ['workspaceId', 'docId', 'title', 'summary'],
    },
  });
  t.is(result1.total, 1);
  t.is(result1.nodes.length, 1);
  t.deepEqual(result1.nodes[0].fields.docId, [docId1]);
  let result2 = await indexerService.search({
    table: SearchTable.doc,
    query: {
      type: SearchQueryType.boolean,
      occur: SearchQueryOccur.must,
      queries: [
        {
          type: SearchQueryType.match,
          field: 'workspaceId',
          match: workspaceId,
        },
        {
          type: SearchQueryType.match,
          field: 'docId',
          match: docId2,
        },
      ],
    },
    options: {
      fields: ['workspaceId', 'docId', 'title', 'summary'],
    },
  });
  t.is(result2.total, 1);
  t.is(result2.nodes.length, 1);
  t.deepEqual(result2.nodes[0].fields.docId, [docId2]);
  let result3 = await indexerService.search({
    table: SearchTable.block,
    query: {
      type: SearchQueryType.boolean,
      occur: SearchQueryOccur.must,
      queries: [
        {
          type: SearchQueryType.match,
          field: 'workspaceId',
          match: workspaceId,
        },
        {
          type: SearchQueryType.match,
          field: 'docId',
          match: docId1,
        },
      ],
    },
    options: {
      fields: ['workspaceId', 'docId', 'blockId', 'content', 'flavour'],
    },
  });
  t.is(result3.total, 1);
  t.is(result3.nodes.length, 1);
  t.deepEqual(result3.nodes[0].fields.docId, [docId1]);

  let result4 = await indexerService.search({
    table: SearchTable.block,
    query: {
      type: SearchQueryType.boolean,
      occur: SearchQueryOccur.must,
      queries: [
        {
          type: SearchQueryType.match,
          field: 'workspaceId',
          match: workspaceId,
        },
        {
          type: SearchQueryType.match,
          field: 'docId',
          match: docId2,
        },
      ],
    },
    options: {
      fields: ['workspaceId', 'docId', 'blockId', 'content', 'flavour'],
    },
  });
  t.is(result4.total, 1);
  t.is(result4.nodes.length, 1);
  t.deepEqual(result4.nodes[0].fields.docId, [docId2]);

  await indexerService.deleteDoc(workspaceId, docId1, {
    refresh: true,
  });

  // make sure the docId1 is deleted
  result1 = await indexerService.search({
    table: SearchTable.doc,
    query: {
      type: SearchQueryType.boolean,
      occur: SearchQueryOccur.must,
      queries: [
        {
          type: SearchQueryType.match,
          field: 'workspaceId',
          match: workspaceId,
        },
        {
          type: SearchQueryType.match,
          field: 'docId',
          match: docId1,
        },
      ],
    },
    options: {
      fields: ['workspaceId', 'docId', 'title', 'summary'],
    },
  });
  t.is(result1.total, 0);
  t.is(result1.nodes.length, 0);

  // make sure the docId2 is not deleted
  result2 = await indexerService.search({
    table: SearchTable.doc,
    query: {
      type: SearchQueryType.boolean,
      occur: SearchQueryOccur.must,
      queries: [
        {
          type: SearchQueryType.match,
          field: 'workspaceId',
          match: workspaceId,
        },
        {
          type: SearchQueryType.match,
          field: 'docId',
          match: docId2,
        },
      ],
    },
    options: {
      fields: ['workspaceId', 'docId', 'title', 'summary'],
    },
  });
  t.is(result2.total, 1);
  t.is(result2.nodes.length, 1);
  t.deepEqual(result2.nodes[0].fields.docId, [docId2]);

  // make sure the docId1 block is deleted
  result3 = await indexerService.search({
    table: SearchTable.block,
    query: {
      type: SearchQueryType.boolean,
      occur: SearchQueryOccur.must,
      queries: [
        {
          type: SearchQueryType.match,
          field: 'workspaceId',
          match: workspaceId,
        },
        {
          type: SearchQueryType.match,
          field: 'docId',
          match: docId1,
        },
      ],
    },
    options: {
      fields: ['workspaceId', 'docId', 'blockId', 'content', 'flavour'],
    },
  });
  t.is(result3.total, 0);
  t.is(result3.nodes.length, 0);
  // docId2 block should not be deleted
  result4 = await indexerService.search({
    table: SearchTable.block,
    query: {
      type: SearchQueryType.boolean,
      occur: SearchQueryOccur.must,
      queries: [
        {
          type: SearchQueryType.match,
          field: 'workspaceId',
          match: workspaceId,
        },
        {
          type: SearchQueryType.match,
          field: 'docId',
          match: docId2,
        },
      ],
    },
    options: {
      fields: ['workspaceId', 'docId', 'blockId', 'content', 'flavour'],
    },
  });
  t.is(result4.total, 1);
  t.is(result4.nodes.length, 1);
  t.deepEqual(result4.nodes[0].fields.docId, [docId2]);
});

// #endregion

// #region listDocIds()

test('should list doc ids work', async t => {
  const workspaceId = randomUUID();
  const docs = [];
  const docCount = 20011;
  for (let i = 0; i < docCount; i++) {
    docs.push({
      workspaceId,
      docId: randomUUID(),
      title: `hello world ${i} ${randomUUID()}`,
      summary: `this is a test ${i} ${randomUUID()}`,
      createdByUserId: user.id,
      updatedByUserId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  await indexerService.write(SearchTable.doc, docs, {
    refresh: true,
  });
  const docIds = await indexerService.listDocIds(workspaceId);
  t.is(docIds.length, docCount);
  t.deepEqual(docIds.sort(), docs.map(doc => doc.docId).sort());
  await indexerService.deleteWorkspace(workspaceId, {
    refresh: true,
  });
  const docIds2 = await indexerService.listDocIds(workspaceId);
  t.is(docIds2.length, 0);
});

// #endregion
