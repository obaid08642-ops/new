import Document, { Html, Head, Main, NextScript, type DocumentContext, type DocumentInitialProps } from "next/document";

type Props = DocumentInitialProps & { nonce?: string };

// F68: src/proxy.ts puts a fresh nonce on every request (x-nonce); the policy only runs scripts that carry it.
export default class AdminDocument extends Document<Props> {
  static async getInitialProps(context: DocumentContext): Promise<Props> {
    const initial = await Document.getInitialProps(context);
    const header = context.req?.headers["x-nonce"];
    return { ...initial, nonce: typeof header === "string" ? header : undefined };
  }

  render() {
    const { nonce } = this.props;
    return (
      <Html lang="ar">
        <Head nonce={nonce} />
        <body className="antialiased">
          <Main />
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}
