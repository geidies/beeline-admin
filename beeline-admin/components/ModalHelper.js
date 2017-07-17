import {mapGetters, mapActions, mapState} from 'vuex'

module.exports = {
  data() {
    return {
      modalComponent: null,
      modalProps: null
    }
  },
  components: {
    // All the modals I need...
    CreateTripsDatePicker: require('../modals/CreateTripsDatePicker.vue'),
    CommonModals: require('../modals/CommonModals.vue'),
    TripEditor: require('../modals/TripEditor.vue'),
  },
  computed: {
    ...mapState('modals', ['_resolve', '_reject', 'options'])
  },
  watch: {
    _resolve () {
      if (this._resolve) {
        const {_resolve, _reject, options} = this

        this.show(options.component, options.props)
          .then(_resolve, _reject)
      }
    }
  },
  render(h) {
    if (this.modalComponent) {
      return h(
        this.modalComponent,
        {
          props: this.modalProps,
          ref: 'theModal'
        }
      )
    } else {
      return ''
    }
  },
  methods: {
    show(comp, props) {
      this.modalComponent = comp
      this.modalProps = props

      return new Promise((resolve, reject) => {
        this.$nextTick(() => {
          this.$refs.theModal.show()
          .then(resolve, reject)
        })
      })
    }
  }
}