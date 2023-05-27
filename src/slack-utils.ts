export interface SlackTextBlock {
  blocks: {
    type: string;
    text: {
      type: string;
      text: string;
    };
  }[];
}

export const question = (
  title: string,
  imageUrl: string,
  sourceFolder: string,
  generatedMemesFolder: string,
  text: string
) => {
  const values = [sourceFolder, generatedMemesFolder, text, title, imageUrl];
  const value = values.join('|');
  return {
    blocks: [
      {
        type: 'context',
        elements: [
          {
            type: 'plain_text',
            text: title,
            emoji: true,
          },
        ],
      },
      {
        type: 'image',
        image_url: imageUrl,
        alt_text: title,
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Send️',
              emoji: true,
            },
            style: 'primary',
            value,
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Shuffle',
              emoji: true,
            },
            value,
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Cancel',
              emoji: true,
            },
            style: 'danger',
            value,
          },
        ],
      },
    ],
  };
};

export const listPeople = (people: string[]): SlackTextBlock => {
  const header = {
    type: 'header',
    text: {
      type: 'plain_text',
      text: 'People',
      emoji: true,
    },
  };

  const response = {
    blocks: [
      header,
      ...people.map((person) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${person} <https://www.dropbox.com/home/meme-say/source/${person}|View>`,
        },
      })),
    ],
  };
  return response;
};
export const response = (title: string, imageUrl: string) => ({
  blocks: [
    {
      type: 'image',
      title: {
        type: 'plain_text',
        text: title,
      },
      image_url: imageUrl,
      alt_text: title,
      block_id: 'derp',
    },
  ],
});

export const helpText = () => ({
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Use the command in the following format `/meme-say [name-of-person] [first-sentence;second-sentence]`',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Example usage: `/meme-say alex LGTM; approved`',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'List available meme-able people using : `/meme-say list`',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'To add a team-member add a new photo in this [dropbox](https://www.dropbox.com/scl/fo/7wqhtk0os4c19iopirtrp/h?dl=0&rlkey=xxnireuv2xzb6ssgnmgxwqes4)',
      },
    },
  ],
});
