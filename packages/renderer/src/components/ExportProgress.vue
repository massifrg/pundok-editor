<script lang="ts">
import { mapState } from 'pinia';
import { useActions } from '../stores';
import { ACTION_BACKEND_FEEDBACK, EditorAction } from '../actions';
import { BackendFeedbackActionProps, FeedbackMessage } from '../common';

export default {
  props: ['editorKey'],
  data() {
    return {
      error: false,
      run: 0,
      value: undefined as number | undefined,
      isPercent: false,
      prevPage: -1,
      maxPage: 0,
    }
  },
  computed: {
    ...mapState(useActions, ['lastAction']),
  },
  watch: {
    lastAction(action: EditorAction) {
      const { name, editorKey, props } = action
      if (this.editorKey == editorKey && name === ACTION_BACKEND_FEEDBACK.name) {
        const { feedback: { message, type } } = props as BackendFeedbackActionProps
        // const { message, type } = feedback
        if (type === 'progress') {
          if (message.startsWith("pages")) {
            let page: number | undefined = undefined
            message.replace(/realpage\s+(\d+)/, (_, p) => {
              page = parseInt(p)
              return _
            })
            if (page) {
              if (page < this.prevPage || this.prevPage < 0) {
                this.run++
                console.log(`page ${page}, prev ${this.prevPage} => RUN ${this.run}`)
              }
              if (page > this.maxPage)
                this.maxPage = page
              this.isPercent = this.run > 1 && this.maxPage > 0
              this.value = this.isPercent
                ? Math.round(100 * page / this.maxPage)
                : page
              this.prevPage = page
            } else if (message.startsWith('mtx-context')) {
              if (message.indexOf('fatal error'))
                this.error = true
            }
            // console.log(`export progress: ${this.percent}% of ${this.maxPage}`)
          }
        }
      }
    }
  }
}
</script>

<template>
  <q-circular-progress show-value :color="error ? 'red' : (run > 1 ? 'green' : 'yellow')" :value="run" :min="0" :max="8"
    :thickness="0.25" rounded size="2rem" class="q-ma-xs">
    <q-circular-progress show-value color="blue" :min="0" :max="100" :value="value" rounded :thickness="0.6"
      size="1.5rem" font-size="10px" class="q-ma-xs">
      {{ isPercent ? value + '%' : value && `p.${value}` || '0' }}
    </q-circular-progress>
  </q-circular-progress>
</template>