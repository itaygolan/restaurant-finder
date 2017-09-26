const nodemailer = require('nodemailer'); // interface with SMTP to do the sending of the email for you
const pug = require('pug');
const juice = require('juice'); // inlines CSS given html
const htmlToText = require('html-to-text');
const promisify = require('es6-promisify');

// create a transport for SMTP
const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

const generateHTML = (filename, options = {}) => { // no need to export
  const html = pug.renderFile(`${__dirname}/../views/email/${filename}.pug`, options); // dirname is the current directory we are running file from
  const inlined = juice(html);
  return inlined;
};

exports.send = async (options) => {
  const html = generateHTML(options.filename, options);
  const mailOptions = {
    from: `Itay <noreply@itay.com>`,
    to: options.user.email,
    subject: options.subject,
    html,
    text: htmlToText.fromString(html)
  };
  const sendMail = promisify(transport.sendMail, transport);
  return sendMail(mailOptions);
};
