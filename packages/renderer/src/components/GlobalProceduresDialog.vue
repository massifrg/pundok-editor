<script lang="ts">
import IndexTerms from './globalprocedures/IndexTerms.vue';

export default {
  props: ['editor', 'visible'],
  emits: ['show', 'hide'],
  data() {
    return {
      splitterModel: 20,
      tab: "indices"
    }
  },
  components: {
    IndexTerms
  },
  methods: {
  }
}
</script>

<template>
  <q-dialog persistent :model-value="visible" @show="$emit('show')" @hide="$emit('hide')">
    <q-card style="min-width: 640px">
      <q-card-section>
        <q-splitter v-model="splitterModel">
          <template v-slot:before>
            <q-card>
              <q-card-section>
                <q-tabs v-model="tab" vertical>
                  <q-tab name="indices" icon="mdi-cursor-pointer" label="Indices" />
                  <!-- <q-tab name="alarms" icon="mdi-alarm" label="Alarms" />
              <q-tab name="movies" icon="mdi-movie" label="Movies" /> -->
                </q-tabs>
              </q-card-section>
            </q-card>
          </template>
          <template v-slot:after>
            <div style="min-width: 300px; min-height: 300px">
              <q-tab-panels v-model="tab" animated swipeable vertical transition-prev="jump-up"
                transition-next="jump-up">
                <q-tab-panel name="indices">
                  <IndexTerms :editor="editor" />
                </q-tab-panel>
                <!-- <q-tab-panel name="alarm"></q-tab-panel>
            <q-tab-panel name="movie"></q-tab-panel> -->
              </q-tab-panels>
            </div>
          </template>
        </q-splitter>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn label="close" @click="$emit('hide')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>