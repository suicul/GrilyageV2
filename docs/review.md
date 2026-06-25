# Technical Review — P0-5: Исправление IDOR в `getMyOrderById`

> **Дата:** июнь 2026  
> **Ревьюер:** Sisyphus (AI Agent)  
> **Объект ревью:** `apps/api/src/mobile/mobile.service.ts`, `apps/api/src/mobile/mobile.service.spec.ts`  
> **Код не изменён**  
> **Статус:** REVIEWED

---

## Резюме

Изменение **корректно устраняет IDOR-уязвимость** в `getMyOrderById` и убирает лишний запрос к БД. Однако внесены неявные изменения в public API, есть риск утечки `userId`, и тесты используют строковые литералы вместо enum.

**Итоговая оценка:** ⚠️ **Approve with minor changes** — нужны 2 небольших правки перед мержем.

---

## 1. Найденные проблемы

### 1.1. 🔴 Утечка `userId` в ответе API (Public API change)

| Параметр | Описание |
|----------|----------|
| **Файл** | `apps/api/src/mobile/mobile.service.ts` |
| **Строка** | 457 — добавлен `userId: true` в `select` |
| **Проблема** | Метод возвращает `order` целиком, включая `userId`. Раньше это поле не возвращалось. Mobile app и клиенты теперь получают `userId` владельца заказа. |
| **Риск** | **Изменение API-контракта + утечка внутреннего идентификатора.** Хотя `userId` не является прямо PII, это внутренний UUID, который раньше не был частью ответа. |
| **Регрессия** | Нет прямой регрессии, но public API расширен неявно. |
| **Рекомендация** | Удалить `userId` из возвращаемого объекта перед `return order`. Варианты: <br>1. `const { userId: _, ...result } = order; return result;` <br>2. Вынести `userId` в отдельную переменную до деструктуризации. |

```typescript
// Рекомендуемый подход
const { userId: ownerId, ...orderWithoutUserId } = order;
if (ownerId !== userId) throw new UnauthorizedException('Доступ запрещён');
return orderWithoutUserId;
```

### 1.2. 🟡 Guest orders всегда возвращают 401

| Параметр | Описание |
|----------|----------|
| **Файл** | `apps/api/src/mobile/mobile.service.ts` |
| **Строка** | 466 — `if (order.userId !== userId) throw ...` |
| **Проблема** | В схеме Prisma `Order.userId` — nullable (`String?`). Если заказ создан без авторизации (guest), `userId === null`. Тогда `null !== userId` всегда `true`, и любой авторизованный пользователь получит 401. |
| **Риск** | **Функциональная регрессия для guest-заказов.** Если в бизнес-модели предусмотрен просмотр guest-заказа по номеру телефона/email, этот сценарий сломан. |
| **Примечание** | Старый код вёл себя так же (`dbOrder?.userId !== userId`), поэтому это **не новая регрессия**, но теперь она более явная. |
| **Рекомендация** | Задокументировать поведение: «guest-заказы недоступны в `getMyOrderById`». Если такой сценарий нужен — реализовать отдельный endpoint. |

### 1.3. 🟡 Строковые литералы вместо enum в тестах

| Параметр | Описание |
|----------|----------|
| **Файл** | `apps/api/src/mobile/mobile.service.spec.ts` |
| **Строка** | 149 — `status: 'NEW'`, 157 — `status: 'NEW'` |
| **Проблема** | В тестах используется строка `'NEW'` вместо enum `OrderStatus`. Это антипаттерн: при рефакторинге enum изменится, а тесты останутся рабочими только потому, что Prisma мок не проверяет тип. |
| **Риск** | Слабая типизация в тестах, риск рассинхронизации с схемой. |
| **Рекомендация** | Импортировать `OrderStatus` из `@prisma/client` и использовать `OrderStatus.NEW`. |

### 1.4. 🟡 Нет теста на guest order

| Параметр | Описание |
|----------|----------|
| **Файл** | `apps/api/src/mobile/mobile.service.spec.ts` |
| **Проблема** | В тестах не покрыт сценарий `userId: null`. Нет документации ожидаемого поведения. |
| **Риск** | Если в будущем изменится логика guest-заказов, regression не будет пойман. |
| **Рекомендация** | Добавить тест: `should throw UnauthorizedException for guest order`. |

### 1.5. 🟢 Лишнее поле `comment: null`

| Параметр | Описание |
|----------|----------|
| **Файл** | `apps/api/src/mobile/mobile.service.spec.ts` |
| **Строка** | 154 — `comment: null` |
| **Проблема** | Минорно: можно опустить `comment`, если оно не участвует в тестируемой логике. |
| **Риск** | Незначительный шум в тесте. |
| **Рекомендация** | Убрать `comment: null` для краткости. |

---

## 2. Что сделано хорошо

| # | Пункт | Комментарий |
|---|-------|-------------|
| 1 | **Устранён IDOR** | `order.userId !== userId` корректно сравнивает два cuid. |
| 2 | **Убран лишний запрос** | Один `findUnique` вместо двух. Уменьшение нагрузки на БД. |
| 3 | **Минимальные изменения** | Изменены только 2 файла, логика осталась понятной. |
| 4 | **Добавлены тесты** | 3 новых unit-теста покрывают happy path, 404, 401. |
| 5 | **Сохранена обработка ошибок** | `NotFoundException` и `UnauthorizedException` на месте. |
| 6 | **Консистентность с `getMyOrderCourierInfo`** | Теперь оба метода используют одинаковую проверку `order.userId !== userId`. |

---

## 3. Проверки, которые стоит добавить

### 3.1. Проверка типов Prisma

После изменения `select` Prisma генерирует новый тип возвращаемого значения. Нужно убедиться, что:
- `order.userId` имеет тип `string | null`
- Деструктуризация `const { userId: ownerId, ...rest } = order` не ломает тип
- Return type метода не включает `userId` (если применить рекомендацию 1.1)

### 3.2. Проверка mobile controller

```typescript
@Get('orders/:id')
getOrder(@Req() req: any, @Param('id') id: string) {
  return this.mobile.getMyOrderById(req.user.sub, id);
}
```

`req.user.sub` — строка. Сравнение `string !== string | null` — безопасно. Проблем нет.

### 3.3. Проверка e2e / интеграционных тестов

Если есть e2e тесты, которые проверяют форму ответа `GET /mobile/orders/:id`, они могут упасть из-за появления нового поля `userId`.

---

## 4. Проблемы типизации

| # | Проблема | Статус |
|---|----------|--------|
| 1 | `req.user.sub` — `any` в `mobile.controller.ts` | **Предыдущий техдолг**, не связан с P0-5. Рекомендуется типизировать через `Express.Request`. |
| 2 | `order.userId` — `string \| null` | **Корректно** по схеме. Сравнение с `string` безопасно. |
| 3 | Тесты используют строки вместо enum | **Найдено в рамках ревью**, см. 1.3. |

---

## 5. Рекомендации по исправлению

### Обязательные (до мержа)

1. **Убрать `userId` из ответа API**
   ```typescript
   const { userId: ownerId, ...orderWithoutUserId } = order;
   if (ownerId !== userId) throw new UnauthorizedException('Доступ запрещён');
   return orderWithoutUserId;
   ```

2. **Использовать enum в тестах**
   ```typescript
   import { OrderStatus } from '@prisma/client';
   // ...
   status: OrderStatus.NEW,
   ```

### Желательные

3. **Добавить тест на guest order**
   ```typescript
   it('should throw UnauthorizedException for guest order (userId is null)', async () => {
     mockPrisma.order.findUnique.mockResolvedValue({ ...sampleOrder, userId: null });
     await expect(
       service.getMyOrderById('user-1', 'ord-1'),
     ).rejects.toThrow(UnauthorizedException);
   });
   ```

4. **Добавить комментарий в код**
   ```typescript
   // Guest orders (userId === null) are not accessible via this endpoint.
   if (order.userId !== userId) throw new UnauthorizedException('Доступ запрещён');
   ```

---

## 6. Итог

| Категория | Найдено | Критичность |
|-----------|---------|-------------|
| Баги | 0 | — |
| Регрессии | 1 (неявное изменение API) | 🟡 Средняя |
| Антипаттерны | 1 (строки вместо enum) | 🟢 Низкая |
| Неоптимальный код | 0 | — |
| Пропущенные проверки | 2 (guest order, утечка userId) | 🟡 Средняя |
| Проблемы типизации | 1 (строки вместо enum) | 🟢 Низкая |

**Вердикт:** Изменение решает security-проблему и проходит тесты, но перед мержем нужно:
1. Убрать `userId` из возвращаемого ответа.
2. Заменить строковые литералы на `OrderStatus` enum.

Это 2 небольших правки, которые не сломают функционал и сохранят API contract.

---

*Review создан на основе последних изменений (P0-5). Дата: июнь 2026. Код не изменён.*
