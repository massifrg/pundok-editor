<template>
  <div class="modal-content" :style="{ display, top: modalTop, left: modalLeft }" @mousemove="move">
    <div class="modal-header">
      <div class="modal-handle" @dragstart="start" @mousedown="start" @drag="move" @mousemove="move" @mouseup="drop">
        <q-icon name="mdi-dots-grid" />
      </div>
      <div class="modal-transparent" />
    </div>
    <div class="modal-slot">
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
export default {
  props: ['visible', 'top', 'left'],
  data() {
    return {
      startTop: this.top || 0,
      startLeft: this.left || 0,
      modalTop: this.top || 0,
      modalLeft: this.left || 0,
      dragging: false,
    };
  },
  computed: {
    display() {
      return this.visible ? 'block' : 'none';
    },
  },
  methods: {
    start(e: MouseEvent) {
      if (e.buttons !== 0) {
        const modalcontent = document.getElementsByClassName('modal-content')[0] as HTMLElement;
        this.startTop = e.pageY - modalcontent.offsetTop;
        this.startLeft = e.pageX - modalcontent.offsetLeft;
        this.modalTop = this.startTop;
        this.modalLeft = this.startLeft;
        this.dragging = true;
      }
    },
    move(e: MouseEvent) {
      if (e.buttons === 0) this.dragging = false;
      if (this.dragging) {
        this.modalTop = e.pageY - this.startTop + 'px';
        this.modalLeft = e.pageX - this.startLeft + 'px';
      }
    },
    drop() {
      if (this.dragging) {
        this.dragging = false;
      }
    },
  },
};
</script>

<style>
div.modal-content {
  position: fixed;
  z-index: 10e20;
  margin: auto;
  padding: 0;
  min-width: 200px;
  width: auto;
  height: auto;
}

div.modal-handle {
  padding: 2px 16px;
  background-color: gray;
  border-top-left-radius: 1rem;
  border-top-right-radius: 1rem;
  color: white;
  height: 30px;
  width: 4rem;
  text-align: center;
  cursor: grab;
}

div.modal-transparent {
  opacity: 0;
}

div.modal-slot {
  border: 2px solid gray;
  background-color: #fefefe;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
  -webkit-animation-name: animatetop;
  -webkit-animation-duration: 0.4s;
  animation-name: animatetop;
  animation-duration: 0.4s;
}
</style>