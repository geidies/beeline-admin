<template>
  <div class="container-fluid withnav route-passes">
    <LoadingSpinner ref="loadingSpinner"/>
    <ModalHelper ref="modalHelper"/>

    <div class="row" v-if="!companyId">
      Please select a company
    </div>
    <div class="row" v-else-if="!transactions || !allRoutes">
      Loading...
    </div>
    <div class="row">
      <div class="col-sm-8">
        <h1>Route Passes</h1>
        <h2>Search selected dates by:</h2>
        <form>
          <div class="form-group">
            <user-id-selector v-model="filter.userId"/>
          </div>
          <div class="form-group">
            <label>Tag</label>
            <route-tag-selector v-model="filter.tag" :companyId="companyId" />
          </div>
          <div class="form-group">
            <label>TransactionType</label>
            <select v-model="filter.transactionType">
              <option v-for="(transactionType, index) in transactionTypes"
                :label="transactionType"
                :value="transactionType"
                />
            </select>
            <input type="hidden" class="form-control" v-model="filter.transactionType">
          </div>
          <div class="form-group">
            <div class="checkbox">
              <label><input type="checkbox" v-model="filter.hideUncommittedTransactions">Hide uncommitted transactions</label>
            </div>
          </div>
          <br>

        </form>
      </div>
      <div class="col-sm-4">
        <div class="datepicker-wrap">
          <h4 class="text-center">
            Select the start date, and the end date:
          </h4>
          <span-select @month-changed="monthChanged" v-model="filter.dates" :special-dates="specialDates"/>
        </div>
      </div>
    </div>
    <div class="row text-center">
      <div class="col-lg-12">
          <uib-pagination :boundary-links="true" v-model="paging.page" :total-items="transactionSummary.totalItems" :items-per-page="paging.perPage"/>
          <div>
            Showing {{paging.page * paging.perPage + 1}} to {{paging.page * paging.perPage + (transactions || []).length}} of {{transactionSummary.totalItems}}
          </div>
      </div>
    </div>
    <div class="row">
      <div class="col-sm-12">
        <table class="table">
          <thead>
            <tr>
              <th>S/N</th>
              <th>Txn ID</th>
              <th>Charge ID</th>
              <th>Txn Timestamp</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Redeemed Ticket ID</th>
              <th>Route Label</th>
              <th>Route Description</th>
              <th>Description</th>
              <th>Type</th>
              <th>User</th>
              <th>Tag</th>
              <th>Payment Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(txn, index) in transactions">
              <td>{{ index + 1 + paging.page * paging.perPage }}</td>
              <td>
                <a :href="`#/c/${companyId}/transactions?id=${txn.transactionId}`">
                  {{txn.transactionId}}<br/>
                </a>
                <a v-if="txn.refundingTransactionId" :href="`#/c/${companyId}/transactions?id=${txn.refundingTransactionId}`">{{txn.refundingTransactionId}}</a>
              </td>
              <td>
                <span v-if="txn.transaction.committed">
                  {{txn.payment && txn.payment.paymentResource}}<br/>
                  <span v-if="txn.refundPayment && txn.refundPayment.paymentResource">{{txn.refundPayment.paymentResource}}<br/></span>
                  {{txn.payment && txn.payment.destinationResoure}}<br/>
                  <button :class="`btn ${txn.redeemed ? 'btn-default' : 'btn-danger'}`" v-if="txn.transaction.committed && (txn.transaction.type === 'routePassPurchase' || txn.transaction.type === 'conversion') && !txn.refundingTransactionId"
                    @click="refund(txn)">
                    Refund
                    &dollar;{{routePassPurchasePrice(txn).toFixed(2)}}
                  </button>
                </span>
                <span v-if="!txn.transaction.committed">
                  {{txn.uncommitReason}}
                </span>
              </td>
              <td>{{f.date(txn.createdAt, 'dd mmm yyyy HH:mm:ss')}}</td>
              <td>{{txn.expiresAt !== undefined ? f.date(txn.expiresAt, 'dd mmm yyyy') : ''}}</td>
              <td :title="`Transaction ID: ${txn.transactionId}`">
                <span class="label txn-redeemed" v-if="txn.redeemed && txn.transaction.committed && !txn.refundingTransactionId">Redeemed</span>
                <span class="label txn-valid" v-if="!txn.redeemed && txn.transaction.committed && !txn.refundingTransactionId">Valid</span>
                <span class="label txn-failed" v-if="!txn.transaction.committed">Failed</span>
                <span class="label txn-refunded" v-if="txn.transaction.committed && txn.refundingTransactionId">Refunded</span>
              </td>
              <td>{{txn.redeemed}}</td>
              <td>{{txn.routeLabel}}</td>
              <td>{{txn.routeDescription}}</td>
              <td>{{txn.description}}</td>
              <td>{{txn.transaction.type}}</td>
              <td>
              <a :href="`#/c/${companyId}/users/${txn.routePass.userId}`">
              <strong>{{txn.routePass.user.name}}</strong>
              <br>(UID: {{txn.routePass.userId}})</a>
              <br>{{txn.routePass.user.telephone}}
              <br>{{txn.routePass.user.email}}
              <br>
                <span class="discount-code label" v-if="txn.promo && txn.promo.promoId"
                    :href="`#/c/${companyId}/promotions/${txn.promo.promoId}`">
                  <span v-if="txn.promo.code">{{txn.promo.code}}</span>
                  <span v-else><i>(automatic)</i></span>
                  (#{{txn.promo.promoId}})
                </span>
              </td>
              <td><ul class="tags"><li class="tags">{{txn.routePass.tag}}</li></ul></td>
              <td>
                {{routePassPurchasePrice(txn).toFixed(2)}}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="row text-center">
      <div class="col-lg-12">
          <uib-pagination :boundary-links="true" v-model="paging.page" :total-items="transactionSummary.totalItems" :items-per-page="paging.perPage"/>
      </div>
    </div>
  </div>
</template>
<script>
import assert from 'assert'
import querystring from 'querystring'
import {mapGetters, mapActions, mapState} from 'vuex'
import _ from 'lodash'
import * as resources from '../stores/resources'
import filters from '../filters'

export default {
  props: ['companyId', 'userId'],
  data () {
    return {
      filter: {
        dates: [],
        selectedMonth: new Date(),
        tag: null,
        transactionType: null,
        hideUncommittedTransactions: false,
        userId: this.userId,
      },
      paging: {
        page: 0,
        perPage: 20,
      },
      transactions: [],
      transactionTypes: ['', 'conversion', 'routePassPurchase', 'ticketPurchase', 'refundPayment', 'freeRoutePass', 'routePassExpiry'],
      allRoutesPromise: this.fetch('allRoutes'),
      publicHolidaysPromise: this.fetch('publicHolidays')
    }
  },
  created () {

  },
  components: {

  },
  computed: {
    ...mapGetters(['axios']),
    ...mapState('shared', ['allRoutes', 'publicHolidays']),

    f: () => filters,

    routePassTagToLabel () {
      return _(this.allRoutes)
        .filter(route => route.transportCompanyId === this.companyId)
        .flatMap(route => route.tags
          .filter(t => t.startsWith('rp-') || t.startsWith('crowdstart-'))
          .map(t => [t, { label: route.label, description: route.name }])
        )
        .fromPairs()
        .value()
    },
    specialDates () {
      return this.publicHolidayDates.concat(this.highlightDays)
    },
    highlightDays () {
      return _.keys(this.transactionSummary.txnCountByDay)
        .map(date => ({
          date: new Date(parseInt(date)),
          annotation: this.transactionSummary.txnCountByDay[date],
          selectable: true,
        }))
    },
    transactionSummaryQuery () {
      return this.buildQuery({}, this.filter)
    },
    transactionQuery () {
      return this.buildQuery(this.paging, this.filter)
    }
  },
  asyncComputed: {
    transactionSummary: {
      get () {
        return this.companyId
          ? this.axios
            .get(
              `/companies/${this.companyId}/transaction_items/route_passes/summary?` +
              querystring.stringify(this.transactionSummaryQuery)
            )
            .then(response => _.pick(response.data, ['totalItems', 'txnCountByDay']))
            .catch(this.showErrorModal)
          : {
            txnCountByDay: {},
            totalItems: 0
          }
      },
      default: {
        txnCountByDay: {},
        totalItems: 0
      }
    },
    publicHolidayDates: {
      async get () {
        await this.publicHolidaysPromise
        return this.publicHolidays.map(ph => (
          {
            date: new Date(ph.date),
            classes: ['public-holiday'],
          }
        ))
      },
      default: []
    }
  },
  watch: {
    filter: {
      deep: true,
      handler: function () {
        this.paging.page = 0
      }
    },
    transactionQuery: {
      immediate: true,
      handler: _.debounce(function () {
        this.loadTransactions()
      }, 1000)
    }
  },
  methods: {
    ...mapActions('spinner', ['spinOnPromise']),
    ...mapActions('modals', ['showModal']),
    ...mapActions('shared', ['fetch']),

    routePassDiscount (txn) {
      return +_.get(txn.routePassItem, 'routePass.notes.discountValue', 0)
    },
    routePassPurchasePrice (txn) {
      return (+txn.credit || 0) - this.routePassDiscount(txn)
    },
    buildQuery (paging, filter) {
      let queryOptions = {}

      if(typeof paging.page === 'number') {
        // paging is zero-indexed, but the endpoint isn't
        queryOptions.page = paging.page + 1
      }

      if(paging.perPage) {
        queryOptions.perPage = paging.perPage
      }

      if(filter.userId) {
        queryOptions.userId = filter.userId
      }

      if(filter.tag) {
        queryOptions.tag = filter.tag
      }

      if(filter.hideUncommittedTransactions){
        queryOptions.hideUncommittedTransactions = filter.hideUncommittedTransactions
      }

      if(filter.transactionType) {
        queryOptions.transactionType = filter.transactionType
      }

      if(filter.dates.length > 0) {
        queryOptions.startDateTime = filter.dates[0].getTime()
      } else {
        queryOptions.startDateTime = new Date(
          filter.selectedMonth.getFullYear(),
          filter.selectedMonth.getMonth(),
          1
        ).getTime()
      }

      if(filter.dates.length > 1) {
        // Because we want less-then-equals semantics
        queryOptions.endDateTime = filter.dates[1].getTime() + 24 * 3600 * 1000
      } else {
        queryOptions.endDateTime = new Date(
          filter.selectedMonth.getFullYear(),
          filter.selectedMonth.getMonth() + 1,
          0
        ).getTime() + 24 * 3600 * 1000
      }

      return queryOptions
    },
    loadTransactions: async function () {
      if (this.companyId) {
        try {
          await this.spinOnPromise(Promise.resolve(true).then(async () => {
            await this.allRoutesPromise
            const response = await this.axios.get(
              `/companies/${this.companyId}/transaction_items/route_passes?` +
              querystring.stringify(this.transactionQuery)
            )
            this.transactions = await this.postProcessTransaction(response.data, this.routePassTagToLabel)
          }))
        } catch (err) {
          this.showErrorModal(err)
        }
      }
    },
    postProcessTransaction (txns, routePassTagToLabel) {
      return Promise.all(_.map(txns, (txn) => {
        // do the route label mapping
        txn.routeLabel = routePassTagToLabel[txn.routePass.tag].label
        txn.routeDescription = routePassTagToLabel[txn.routePass.tag].description
        // to speed up, skip the query transaction items for non-purchase / non-conversion ones
        if (txn.transaction.type !== 'routePassPurchase' && txn.transaction.type !== 'conversion' && txn.transaction.type !== 'ticketPurchase' && txn.transaction.committed) {
          return Promise.resolve(txn)
        } else if (!txn.transaction.committed) {
          return this.queryUncommitReason(txn)
        } else if (txn.transaction.type === 'ticketPurchase') {
          return this.queryTicket(txn)
        } else {
          return this.queryTransactionItems(txn)
        }
      }))
    },
    queryUncommitReason (txn) {
      let queryOptions = {
        transactionId: txn.transactionId
      }
      return this.axios.get(`/transaction_items?${querystring.stringify(queryOptions)}`)
        .then(resp => {
          let paymentItem = resp.data.rows.find(x => x.itemType === 'payment')
          txn.uncommitReason = _.get(paymentItem, 'payment.data.message') || 'Reason is unknown'
          return txn
        })
        .catch(this.showErrorModal)
    },
    queryTicket (txn) {
      txn.description = txn.transaction.description
      const [ticketId] = Object.keys(_.get(txn.notes, 'tickets') || {})
      const queryOptions = { itemTypes: ['ticketSale', 'ticketSale'], ticketId }
      return this.axios.get(`/transaction_items?${querystring.stringify(queryOptions)}`)
          .then(response => {
            const [ticketSale] = response.data.rows
            const [tripDate] = ticketSale.ticketSale.boardStop.time.split('T')
            txn.description = `Trip Date: ${tripDate}`
            return txn
          })
    },
    queryTransactionItems (txn) {
      let queryOptions = {
        transactionId: txn.transactionId
      }
      return this.axios.get(`/transaction_items?${querystring.stringify(queryOptions)}`)
        .then(async resp => {
          let transactionItems = resp.data.rows

          let [paymentItem, promoItem]
            = this.matchByType(transactionItems, ['payment', 'discount'])

          const routePassItem = transactionItems.find(i => i.id === txn.id)

          txn.payment = {
            paymentResource : _.get(paymentItem, 'payment.paymentResource'),
            destinationResoure: _.get(paymentItem, 'payment.data.transfer.destination_payment'),
            paymentAmount : _.get(paymentItem, 'debit')
          }

          txn.promo = {
            code: _.get(promoItem, 'discount.code'),
            promoId: _.get(promoItem, 'discount.promotionId'),
            amount: _.get(promoItem, 'debit')
          }

          txn.routePassItem = routePassItem
          txn.redeemed = _.get(routePassItem.routePass, 'notes.ticketId')
          txn.expiresAt = _.get(routePassItem.routePass, 'expiresAt')

          const perPassDiscount = _.get(promoItem, `notes.tickets[${routePassItem.itemId}]`)
          txn.description = perPassDiscount ? `Discount: ${perPassDiscount.toFixed(2)}` : `No Discount`

          // has been refunded
          if (txn.refundingTransactionId) {
            queryOptions = {
              transactionId: txn.refundingTransactionId
            }
            txn.refundPayment = await this.axios
              .get(`/transaction_items?${querystring.stringify(queryOptions)}`)
              .then(resp => {
                transactionItems = resp.data.rows
                let refundPayment = this.matchByType(transactionItems, ['refundPayment'])
                return {
                  paymentResource:  _.get(refundPayment, '[0]refundPayment.paymentResource')
                }
              })
          }
          return txn
        })
        .catch(this.showErrorModal)
    },
    matchByType (items, typeArray) {
      return typeArray.map(type => items.find(item => item.itemType && item.itemType === type))
    },
    monthChanged (newMonth) {
      this.filter.selectedMonth = newMonth.clone().toDate()
      this.filter.startDate = this.filter.endDate = null
    },
    refund (txn) {
      this.spinOnPromise(this.axios
        .post(
          `/transactions/route_passes/${txn.routePassItem.itemId}/refund/payment`,
          { transactionItemId: txn.routePassItem.id }
        )
        .then(() => {
          this.showModal({
            component: 'CommonModals',
            props: {
              type: 'alert',
              title: 'Success',
              message: 'Refund successful'
            }
          })
        })
        .catch(this.showErrorModal)
        .then(this.loadTransactions)
      )
    },
    showErrorModal (err) {
      console.log(err)
      this.showModal({
        component: 'CommonModals',
        props: {
          type: 'alert',
          title: err.error || 'Error',
          message: `${err && (err.message || (err.data && err.data.message))}`
        }
      })
    }
  }
}
</script>

<style lang="scss">
.span-select {
  width: 100%;
  td, th {
    text-align: center;
    line-height: 3.0;
    position: relative;

    &.selected {
      background-color: #008;
      color: #FFF;
    }
    &.disabled {
      background-color: #888;
      color: #CCC;
    }
    &.different-month {
      opacity: 0.5;
    }
    &:not(.different-month) {
      font-weight: bold;
    }
    &.public-holiday {
      color: #F00;
    }
    div.annotation {
      background-color: #FF6C6A;
      color: #F4F4F4;
      position: absolute;
      bottom: 0;
      right: 0;
      line-height: 1.6;
      font-size: 12px;
      padding: 1px 5px;
    }
  }
  th:not([colspan]) {
    width: 14%;
  }
}
</style>
