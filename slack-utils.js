exports.question = (
  title,
  image_url,
  SOURCE_FOLDER,
  GENERATED_MEMES_FOLDER,
  text
) => {
  const values = [
    SOURCE_FOLDER,
    GENERATED_MEMES_FOLDER,
    text,
    title,
    image_url,
  ];
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
        image_url,
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

exports.listPeople = (people) => {
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
exports.response = (title, image_url) => ({
  blocks: [
    {
      type: 'image',
      title: {
        type: 'plain_text',
        text: title,
      },
      image_url,
      alt_text: title,
      block_id: 'derp',
    },
  ],
});

exports.helpText = () => ({
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
