// Підключаємо технологію express для back-end сервера
const express = require('express')
// Cтворюємо роутер - місце, куди ми підключаємо ендпоїнти
const router = express.Router()

const { User } = require('../class/user')
const { Transactions } = require('../class/transactions')
const { Session } = require('../class/session')
const { Notification } = require('../class/notification')

const TRANSACTION_TYPE = {
  SEND: 'send',
  RECEIVE: 'receive',
}

Transactions.create(
  1,
  TRANSACTION_TYPE.RECEIVE,
  'CoinBase',
  100,
)
Transactions.create(
  1,
  TRANSACTION_TYPE.RECEIVE,
  'CoinBase',
  130,
)
Transactions.create(
  1,
  TRANSACTION_TYPE.SEND,
  'Aliexpres@china',
  100,
)
Transactions.create(
  1,
  TRANSACTION_TYPE.RECEIVE,
  'CoinBase',
  140,
)

User.changeBalance(1, TRANSACTION_TYPE.RECEIVE, 100)
User.changeBalance(1, TRANSACTION_TYPE.RECEIVE, 130)
User.changeBalance(1, TRANSACTION_TYPE.SEND, 100)
User.changeBalance(1, TRANSACTION_TYPE.RECEIVE, 140)
// const user = User.getById(1)
const balance = User.getBalance(1)

router.post('/get-user', function (req, res) {
  const { userId, token } = req.body

  if (!userId || !token) {
    return res
      .status(400)
      .json({ message: 'Відсутній ID користувача' })
  }

  try {
    const session = Session.get(token)

    if (!session) {
      return req.status(400).json({
        message: 'Відсутня авторизація',
      })
    }

    if (userId !== session.user.id) {
      return req.status(400).json({
        message: 'Можливий несанкціонований вхід',
      })
    }
    const user = User.getById(Number(userId))
    if (!user) {
      return res
        .status(400)
        .json({ message: 'Користувача не знайдено' })
    }

    const balance = User.getBalance(Number(userId))

    const list = Transactions.getList(Number(userId))

    return res.status(200).json({
      list: list,
      balance: balance,
    })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
})

// ================================================================

router.post('/get-transaction-data', function (req, res) {
  const { token, userId, transactionId } = req.body
  if (!token || !userId || !transactionId) {
    return res
      .status(400)
      .json({ message: 'Дані не передано' })
  }

  try {
    const session = Session.get(token)

    if (!session) {
      return req.status(400).json({
        message: 'Відсутня авторизація',
      })
    }

    if (userId !== session.user.id) {
      return req.status(400).json({
        message: 'Можливий несанкціонований вхід',
      })
    }

    const user = User.getById(Number(userId))

    if (!user) {
      return res.status(400).json({
        message: 'Користувача з таким ID не знайдено',
      })
    }

    const transaction = Transactions.getById(
      Number(transactionId),
    )

    if (userId !== transaction.userid) {
      return res.status(400).json({
        message:
          'Транзакції користувача з таким ID  не знайдено',
      })
    }
    return res.status(200).json({
      transaction,
    })
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    })
  }
})

// ================================================================
router.post('/recive', function (req, res) {
  let { token, id, type, target, summ } = req.body

  if (!token || !id || !type || !target || !summ) {
    return req
      .status(400)
      .json({ message: 'Дані передано не вірно' })
  }

  summ = Number(summ)
  if (summ < 0) {
    return req.status(400).json({
      message: 'Значення сума повинно бути більше нуля',
    })
  }

  try {
    const session = Session.get(token)
    if (!session) {
      return req.status(400).json({
        message: 'Відсутня авторизація',
      })
    }

    if (id !== session.user.id) {
      return req.status(400).json({
        message: 'Можливий несанкціонований вхід',
      })
    }
    const user = User.getById(Number(id))

    if (!user) {
      return res.status(400).json({
        message: 'Користувача з таким ID не знайдено',
      })
    }

    Transactions.create(id, type, target, summ)
    User.changeBalance(id, type, summ)
    return res.status(200).json({
      message: 'Операцію виконано',
    })
  } catch (error) {
    if (!user) {
      return res.status(400).json({
        message: error.message,
      })
    }
  }
})

// ================================================================
router.post('/send', function (req, res) {
  let { token, id, type, target, summ } = req.body

  if (!token || !id || !type || !target || !summ) {
    return req
      .status(400)
      .json({ message: 'Дані передано не вірно' })
  }

  summ = Number(summ)
  if (summ < 0) {
    return req.status(400).json({
      message: 'Значення сума повинно бути більше нуля',
    })
  }

  try {
    const session = Session.get(token)

    if (!session) {
      return req.status(400).json({
        message: 'Відсутня авторизація',
      })
    }

    if (id !== session.user.id) {
      return req.status(400).json({
        message: 'Можливий несанкціонований вхід',
      })
    }
    const user = User.getById(Number(id))

    if (!user) {
      return res.status(400).json({
        message: 'Користувача з таким ID не знайдено',
      })
    }
    if (user.email === target) {
      return res.status(400).json({
        message: 'Ви не можете надіслати кошти самі собі',
      })
    }

    const balance = User.getBalance(user.id)
    if (balance < summ) {
      return res.status(400).json({
        message: 'Не достатньо коштів',
      })
    }

    const userReciever = User.getByEmail(target)

    Transactions.create(id, type, target, summ)
    User.changeBalance(id, type, summ)
    Notification.create({
      userId: id,
      type: Notification.NOTIFIC_TYPE.INFO,
      text: `Відправлено переказ на суму $${summ} до ${target}`,
    })

    if (userReciever) {
      Transactions.create(
        userReciever.id,
        TRANSACTION_TYPE.RECEIVE,
        user.email,
        summ,
      )
      User.changeBalance(
        userReciever.id,
        TRANSACTION_TYPE.RECEIVE,
        summ,
      )
      Notification.create({
        userId: userReciever.id,
        type: Notification.NOTIFIC_TYPE.INFO,
        text: `Отримано переказ від ${user.email} на суму $${summ}`,
      })
    }
    return res.status(200).json({
      message: 'Операцію виконано',
    })
  } catch (error) {
    if (!user) {
      return res.status(400).json({
        message: error.message,
      })
    }
  }
})
// Підключаємо роутер до бек-енду
module.exports = router
