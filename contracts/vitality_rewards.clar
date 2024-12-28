;; Vitality Rewards Contract
(define-fungible-token vitality-token)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-unauthorized-provider (err u101))
(define-constant err-invalid-user (err u102))
(define-constant err-insufficient-balance (err u103))

;; Data vars
(define-data-var token-name (string-ascii 32) "Vitality Token")
(define-data-var token-symbol (string-ascii 10) "VITAL")

;; Data maps
(define-map health-providers principal bool)
(define-map user-profiles 
    principal 
    {
        total-points: uint,
        activities-completed: uint
    }
)

(define-map activity-rewards
    {activity-type: (string-ascii 32)}
    {points: uint}
)

;; Initialize rewards
(map-set activity-rewards {activity-type: "daily-exercise"} {points: u10})
(map-set activity-rewards {activity-type: "annual-checkup"} {points: u100})
(map-set activity-rewards {activity-type: "vaccine"} {points: u50})

;; Administrative functions
(define-public (register-provider (provider principal))
    (if (is-eq tx-sender contract-owner)
        (begin
            (map-set health-providers provider true)
            (ok true)
        )
        err-owner-only
    )
)

;; User registration
(define-public (register-user)
    (begin
        (map-set user-profiles tx-sender {
            total-points: u0,
            activities-completed: u0
        })
        (ok true)
    )
)

;; Activity verification and reward
(define-public (verify-activity (user principal) (activity-type (string-ascii 32)))
    (let (
        (provider-status (default-to false (map-get? health-providers tx-sender)))
        (reward (unwrap! (map-get? activity-rewards {activity-type: activity-type}) (err u104)))
        (user-profile (unwrap! (map-get? user-profiles user) err-invalid-user))
    )
    (if provider-status
        (begin
            (try! (ft-mint? vitality-token (get points reward) user))
            (map-set user-profiles user {
                total-points: (+ (get total-points user-profile) (get points reward)),
                activities-completed: (+ (get activities-completed user-profile) u1)
            })
            (ok true)
        )
        err-unauthorized-provider
    ))
)

;; Token transfer
(define-public (transfer (amount uint) (sender principal) (recipient principal))
    (let (
        (sender-balance (ft-get-balance vitality-token sender))
    )
    (if (>= sender-balance amount)
        (begin
            (try! (ft-transfer? vitality-token amount sender recipient))
            (ok true)
        )
        err-insufficient-balance
    ))
)

;; Read only functions
(define-read-only (get-user-profile (user principal))
    (map-get? user-profiles user)
)

(define-read-only (get-provider-status (provider principal))
    (default-to false (map-get? health-providers provider))
)

(define-read-only (get-activity-reward (activity-type (string-ascii 32)))
    (map-get? activity-rewards {activity-type: activity-type})
)

(define-read-only (get-balance (account principal))
    (ok (ft-get-balance vitality-token account))
)