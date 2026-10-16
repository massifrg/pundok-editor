<template>
  <main
    v-if="isRemote && authState !== 'authenticated'"
    class="server-login"
    :aria-busy="authState === 'checking'"
  >
    <section v-if="authState === 'checking'" class="server-login__card" aria-live="polite">
      Checking server session…
    </section>
    <form v-else class="server-login__card" @submit.prevent="submitLogin">
      <h1>Sign in to Pundok Editor</h1>
      <label for="server-login-user">Username</label>
      <input
        id="server-login-user"
        v-model.trim="username"
        autocomplete="username"
        required
        :disabled="submitting"
      />
      <label for="server-login-password">Password</label>
      <input
        id="server-login-password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
        :disabled="submitting"
      />
      <p v-if="loginError" class="server-login__error" role="alert">
        {{ loginError }}
      </p>
      <button type="submit" :disabled="submitting">
        {{ submitting ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </main>
  <PundokEditor
    v-else
    ref="editor"
    v-model="content"
    main-editor
    :gui-props="guiProps"
  />
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent } from 'vue';
import { useQuasar } from 'quasar'
import { mapState } from 'pinia';
import { useBackend } from './stores';
import { createBackend } from './backend/backend';
import { NetBackend } from './backend/netbackend';
import testingContent from './assets/test-pandoc.json?raw';
import { EditorGUIPropsClass } from './schema';

export default defineComponent({
  name: 'PandocApp',
  components: {
    "PundokEditor": defineAsyncComponent(() => import('./components/PundokEditor.vue'))
  },
  setup() {
    const backendStore = useBackend();
    const backend = createBackend();
    backendStore.setBackend(backend);
    return { isRemote: backend instanceof NetBackend };
  },
  data() {
    return {
      $q: useQuasar(),
      content: testingContent,
      guiProps: new EditorGUIPropsClass(),
      authState: 'checking' as 'checking' | 'login' | 'authenticated',
      username: '',
      password: '',
      loginError: '',
      submitting: false,
    }
  },
  async mounted() {
    if (!this.isRemote) {
      this.authState = 'authenticated';
      return;
    }
    try {
      this.authState = (await this.backend?.loggedin())
        ? 'authenticated'
        : 'login';
    } catch (error) {
      this.authState = 'login';
      this.loginError =
        error instanceof Error ? error.message : 'Could not check server login.';
    }
  },
  methods: {
    async submitLogin() {
      this.loginError = '';
      if (!this.backend) {
        this.loginError = 'The backend is not available.';
        return;
      }

      this.submitting = true;
      try {
        if (await this.backend.login(this.username, this.password)) {
          this.password = '';
          this.authState = 'authenticated';
        } else {
          this.loginError = 'Invalid username or password.';
        }
      } catch (error) {
        this.loginError =
          error instanceof Error ? error.message : 'Could not sign in.';
      } finally {
        this.submitting = false;
      }
    },
  },
  computed: {
    ...mapState(useBackend, ['backend'])
  },

});
</script>

<style lang="scss">
:root {
  --editor-font-size: 14pt;
}

$font-serif: Georgia, "IBM Plex Serif", "Times New Roman", Times, serif;
$font-sans: Verdana, "IBM Plex Sans", Geneva, Tahoma, sans-serif;
$font-mono: "Fira Code", "Courier New", Courier, monospace;
$font-poetry: "TeX Gyre Chorus", "URW Chancery L Medium";

$color-fg-quoted: #3cd49f;
$color-bg-quoted: #e7f8f2;
$color-bg-quoted-quoted: #c7f0e2;
$color-fg-dt: inherit;
$color-bg-dt: #ffc5a5;
$color-fg-dd: inherit;
$color-bg-dd: #ffdecb;
$color-fg-link: blue;
$color-border-plain: #b59898;
$color-bg-index: #e7d49d;
$color-bg-term: #fff9e6;
$color-fg-index: #dc7200;

@mixin normal-text() {
  font-style: normal;
  font-weight: normal;
  vertical-align: baseline;
}

// .tiptap {}

.ProseMirror {
  background-color: #eeeae1;
  padding-left: 0.3rem;
  font-family: $font-serif;
  font-size: var(--editor-font-size);

  >*+* {
    margin-top: 0.75em;
  }

  // general text
  .serif-font {
    font-family: $font-serif;
    font-size: var(--editor-font-size);
    line-height: 1.5;
    letter-spacing: 0.01rem;
  }

  .sans-font {
    font-family: $font-sans;
    font-size: var(--editor-font-size);
  }

  .mono-font {
    font-family: $font-mono;
    font-size: var(--editor-font-size);
  }

  // selected node
  .ProseMirror-selectednode {
    background-color: #3584e4 !important;
    color: rgb(220, 220, 220) !important;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-weight: bold;
    line-height: normal;
    margin: 0;
    margin-top: 1rem;
  }

  h1 {
    font-size: calc(var(--editor-font-size) * 2);
  }

  h2 {
    font-size: calc(var(--editor-font-size) * 1.8);
  }

  h3 {
    font-size: calc(var(--editor-font-size) * 1.6);
  }

  h4 {
    font-size: calc(var(--editor-font-size) * 1.4);
  }

  h5 {
    font-size: calc(var(--editor-font-size) * 1.2);
  }

  h6 {
    font-size: calc(var(--editor-font-size));
  }

  span.br::before {
    content: "↵";
  }

  span.br.soft::before {
    content: "⏎";
  }

  div.div {
    border: 2px dotted rgb(136, 203, 237);
    border-radius: .3rem;
  }

  div.figure {
    display: block;
    background-color: rgb(255, 204, 255);
    border-radius: 1rem 1rem .3rem .3rem;
    padding: .1rem 1rem;
    margin: .2rem 0rem;
  }

  div.figure div.figure-caption {
    text-align: center;
    border: 2px solid rgb(254, 46, 254);
    border-radius: .7rem .7rem .3rem .3rem;
    margin-bottom: .5rem;

    & div.short-caption {
      font-size: smaller;
      border-bottom: 1px dashed rgb(152, 13, 152);
      background-color: rgb(228, 200, 228);
      border-radius: .7rem .7rem .3rem .3rem;
      margin-bottom: .3rem;
    }

    & p {
      text-indent: 0;
    }
  }

  // taken from https://tiptap.dev/api/nodes/table
  table {
    border-collapse: separate;
    border-spacing: 0px;
    table-layout: fixed;
    max-width: 98%;
    margin: 0;
    overflow: hidden;

    caption {
      text-align: center;
      margin-bottom: 0;
      background-color: #8f8f8f;
      padding: 0;

      & div.short-caption {
        font-size: smaller;
        border-bottom: 1px dashed rgb(59, 59, 59);
        background-color: #c0c0c0;
        margin-bottom: .3rem;
      }

      & p {
        text-indent: 0;
      }
    }

    thead>tr>th.edge-left,
    tfoot>tr>th.edge-left {
      border-left: .5rem solid #ccc;
    }

    thead>tr>th.edge-right,
    tfoot>tr>th.edge-right {
      border-right: .5rem solid #ccc;
    }

    tbody:nth-of-type(odd)>tr>th.edge-left,
    tbody:nth-of-type(odd)>tr>td.edge-left {
      border-left: .5rem solid #ffffa0;
    }

    tbody:nth-of-type(odd)>tr>th.edge-right,
    tbody:nth-of-type(odd)>tr>td.edge-right {
      border-right: .5rem solid #ffffa0;
    }

    tbody:nth-of-type(even)>tr>th.edge-left,
    tbody:nth-of-type(even)>tr>td.edge-left {
      border-left: .5rem solid #a0ffff;
    }

    tbody:nth-of-type(even)>tr>th.edge-right,
    tbody:nth-of-type(even)>tr>td.edge-right {
      border-right: .5rem solid #a0ffff;
    }

    td,
    th {
      display: table-cell;
      min-width: 1em;
      border: 2px solid #ced4da;
      padding: 3px 5px;
      vertical-align: top;
      box-sizing: border-box;
      position: relative;

      >* {
        margin-bottom: 0;
      }

      &.cell-of-blocks {
        // background-color: rgb(250, 255, 231);
        border: 3px solid brown;
      }
    }

    th {
      font-weight: bold;
      text-align: left;
      background-color: #f1f3f5;
    }

    .selectedCell:after {
      z-index: 2;
      position: absolute;
      content: "";
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      background: rgba(200, 200, 255, 0.4);
      pointer-events: none;
    }

    .column-resize-handle {
      position: absolute;
      right: -2px;
      top: 0;
      bottom: -2px;
      width: 4px;
      background-color: #adf;
      pointer-events: none;
    }

    p {
      margin: 0;
    }
  }

  .resize-cursor {
    cursor: ew-resize;
    cursor: col-resize;
  }

  q {
    display: inline;
    background-color: $color-bg-quoted;

    q {
      background-color: $color-bg-quoted-quoted;
    }
  }

  q::before {
    content: '';
    background-color: $color-bg-quoted;
  }

  q::after {
    content: '';
    background-color: $color-bg-quoted;
  }

  span.auto-delimiters::before {
    content: attr(open-delimiter);
  }

  span.auto-delimiters::after {
    content: attr(close-delimiter);
  }

  span.pandoc-link {
    text-decoration: underline;
    color: $color-fg-link;
  }

  span.math {
    background: pink;

    &.display-math {
      padding: .3rem;
      border: 2px solid rgb(140, 45, 61);
      border-radius: .3rem;
    }
  }

  div[class=div] {
    border: dotted 2px #8bc6ff;
  }

  span.plain {
    display: block;
    border: 2px dotted $color-border-plain;
  }

  blockquote {
    background-color: $color-bg-quoted;
    border: 0.1rem solid $color-fg-quoted;
    border-radius: 1rem;
    margin-left: 2rem;
    padding: 0.2rem 0.6rem;
    font-size: calc(var(--editor-font-size)*0.9);

    q {
      background-color: $color-bg-quoted-quoted;
    }
  }

  dl dt {
    background-color: $color-bg-dt;
    border-radius: 0.4rem;
    padding: 0.1rem 0.2rem;
    margin-right: 20%;
  }

  dl dd {
    background-color: $color-bg-dd;
    border-radius: 0.4rem;
    margin-left: 2rem;
    margin-top: 0.4rem;
    padding: 0.1rem 0.2rem;
  }

  dd+dt {
    margin-top: 0.4rem;
  }

  sup,
  sub {
    font-size: smaller;
  }

  .unstyled-custom-style {
    text-decoration: underline dotted 4px #8bc6ff;
  }

  // span.custom-style {
  //   background-color: #b3daff;
  // }

  p {
    text-indent: 1rem;
  }

  div.line-block {
    border: 1px solid blue;
    margin-top: 2px;
    margin-bottom: 2px;
  }

  div.line-block p.line {
    text-indent: 0;
    margin-top: 0;
    margin-bottom: 0;
    font-family: monospace;
  }

  pre.code-block {
    padding: 4px;
    background-color: black;
    color: lightgrey;

    & code {
      font-family: $font-mono;

      & * {
        font-family: $font-mono;
      }
    }
  }

  .raw-inline {
    padding: 4px;
  }

  samp.raw-inline {
    font-family: $font-mono;
    background-color: black;
    color: rgb(199, 235, 235);
    font-size: smaller;
    font-variant: normal;
    font-weight: normal;

    &.format-context {
      color: lightgreen;
      padding: 2px;
    }
  }

  .raw-block {
    text-indent: 0px;
    padding: 4px;
    border: 1px solid black;
  }

  // .raw-block::before {
  //   display: block;
  //   width: auto;
  //   content: attr(data-format);
  //   padding: 3px;
  //   background-color: rgb(125, 125, 125);
  //   color: antiquewhite;
  //   font-family: monospace;
  //   font-size: small;
  // }

  .raw-inline,
  .raw-block code {
    text-indent: 0px;
    font-family: monospace !important;
    font-size: 12pt;
    font-style: normal;
    font-weight: normal;
    font-variant: normal;
    white-space: pre-wrap;
    margin: 0px;
  }

  .raw-inline.format-context,
  .raw-block.format-context {
    color: rgb(150, 220, 150) !important;
    background: black !important;
  }

  .ProseMirror-search-match,
  .search-replace-found {
    // color: white;
    // background-color: rgb(225, 113, 0);
    text-decoration-line: underline;
    text-decoration-color: blue;
    text-decoration-style: dashed;
    text-decoration-thickness: 4px;
    text-decoration-skip-ink: auto;
  }

  .ProseMirror-active-search-match {
    background-color: #00aaff54;
    color: white
  }

  /* metadata */
  div.metadata,
  div.meta-map {
    border-radius: 0.4rem;
    padding: 0px;
  }

  .meta-bool {
    padding: 0;
  }

  .meta-map-content,
  .meta-list-content {
    padding: 0.5rem;
    margin: 0;
    border: .2rem solid rgb(0, 137, 175);
  }

  div.meta-plural-commands {
    background-color: rgb(0, 137, 175);
    color: white;
    border: 0px;
  }

  div.meta-map-entry {
    margin: 0 0 0.6rem 0;
    font-size: smaller;

    & div.meta-map-entry-key {
      background-color: rgb(0, 137, 175);
      color: white;
      max-width: 30%;
      padding-top: .3rem;
      padding-bottom: .2rem;
      padding-left: 1rem;
      padding-right: 1rem;
      margin: 0;
    }

    & div.meta-map-entry-value {
      color: black;
      background-color: rgb(170, 210, 222);
      border-radius: 0;
      margin: 0 .4rem 0 1rem;

      & p {
        margin: 4px;
        text-indent: 0;
      }

      & .meta-list ul>.meta-value {
        display: list-item;
        margin-left: 1rem;
        padding: .3rem 0 .2rem 0;
      }
    }
  }

  span.index-ref {
    border-bottom: 3px solid $color-fg-index;
  }

  span.cite {
    color: rgb(80, 10, 127);
    background-color: rgb(229, 189, 255);
  }

  img.ProseMirror-selectednode,
  .raw-inline.ProseMirror-selectednode {
    border: 2px solid #3584e4;
  }

  hr.ProseMirror-selectednode {
    border-color: #3584e4 !important;
  }

  // start of gapcursor.css
  .ProseMirror-gapcursor {
    display: none;
    pointer-events: none;
    position: absolute;
  }

  .ProseMirror-gapcursor:after {
    content: "";
    display: block;
    position: absolute;
    top: -2px;
    width: 20px;
    border-top: 1px solid black;
    animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
  }

  @keyframes ProseMirror-cursor-blink {
    to {
      visibility: hidden;
    }
  }

  .ProseMirror-focused .ProseMirror-gapcursor {
    display: block;
  }

  // end of gapcursor.css
}
</style>

<style scoped lang="scss">
.server-login {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: #f5f5f5;
  font-family: Verdana, Geneva, Tahoma, sans-serif;
}

.server-login__card {
  display: grid;
  gap: 0.75rem;
  width: min(100%, 22rem);
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  background: white;
  box-shadow: 0 0.5rem 1.5rem #0002;
}

.server-login__card h1 {
  margin: 0 0 0.5rem;
  font-size: 1.4rem;
}

.server-login__card input,
.server-login__card button {
  box-sizing: border-box;
  width: 100%;
  min-height: 2.75rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid #aaa;
  border-radius: 0.25rem;
  font: inherit;
}

.server-login__card button {
  margin-top: 0.5rem;
  border-color: #1769aa;
  background: #1769aa;
  color: white;
  cursor: pointer;
}

.server-login__card button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.server-login__error {
  margin: 0;
  color: #b00020;
}
</style>
