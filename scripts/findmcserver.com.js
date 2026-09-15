async function vote(first) {

    // И ещё более наитупейший костыль дожидающийся загрузки сайта
    // Мы иногда получаем просто пустую страницу без ничего
    // даже нет иконки обозначающей что что-то загружается (настолько говно код на сайте)
    // нам ничего не остаётся кроме как подождать что-то?
    if (document.querySelector('#__next main')?.getElementsByTagName('*')?.length < 50) {
        await new Promise(resolve => {
            const timer = setInterval(() => {
                if (document.querySelector('#__next main')?.getElementsByTagName('*')?.length > 50) {
                    clearInterval(timer)
                    resolve()
                }
            }, 100)
        })
    }

    //А это ещё один костыль дожидающий загрузки сайта
    if (document.querySelector('#__next h2')?.textContent.includes('Application error')) {
        await new Promise(resolve => {
            const timer = setInterval(() => {
                if (!document.querySelector('#__next h2')?.textContent.includes('Application error')) {
                    clearInterval(timer)
                    resolve()
                }
            }, 100)
        })
    }

    //Дожидаемся полной загрузки сайта
    if (document.querySelector('img[alt="loader side"]')) {
        await new Promise(resolve => {
            const timer = setInterval(() => {
                if (!document.querySelector('img[alt="loader side"]')) {
                    clearInterval(timer)
                    resolve()
                }
            }, 100)
        })
    }

    if (document.querySelector('.ant-result')) {
        if (document.querySelector('.ant-result').innerText.trim().includes('404') && document.querySelector('.ant-result').innerText.trim().includes('not found')) {
            const request = {}
            request.message = document.querySelector('.ant-result').innerText.trim()
            request.ignoreReport = true
            request.retryCoolDown = 21600000
            chrome.runtime.sendMessage(request)
            return
        }
    }

    const voteButton = await waitForElement('button#vote-button')
    voteButton.click()

    const project = await getProject()

    const textInputRef = await waitForElement('div[role="dialog"] input[placeholder="Minecraft Username"]')
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    prototypeValueSetter.call(textInputRef, project.nick)
    textInputRef.dispatchEvent(new Event('input', { bubbles: true }))

    const submitButton = await waitForElement(
        'div[role="dialog"] button[aria-label="Vote for the Server"]',
        button => !button.disabled
    )
    submitButton.click()
}

function waitForElement(selector, predicate = () => true) {
    return new Promise(resolve => {
        const findElement = () => Array.from(document.querySelectorAll(selector)).find(predicate)
        const element = findElement()

        if (element) {
            resolve(element)
            return
        }

        const observer = new MutationObserver(() => {
            const element = findElement()
            if (element) {
                observer.disconnect()
                resolve(element)
            }
        })

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['disabled']
        })
    })
}

const timer = setInterval(() => {
    const message = document.querySelector('div.ant-notification')?.innerText.replace(/\s+/g, ' ').trim()
    if (message) {
        const request = {}
        request.message = message
        const normalizedMessage = request.message.toLowerCase()
        if (normalizedMessage.includes('thank you for voting')) {
            clearInterval(timer)
            chrome.runtime.sendMessage({successfully: true})
        } else if (normalizedMessage.includes('can vote for this server once per day') || normalizedMessage.includes('can vote for this server again tomorrow in')) {
            clearInterval(timer)
            chrome.runtime.sendMessage({later: true})
        } else {
            clearInterval(timer)
            if (normalizedMessage.includes('google recaptcha failure')) {
                request.ignoreReport = true
            }
            chrome.runtime.sendMessage(request)
        }
    }
}, 1000)
