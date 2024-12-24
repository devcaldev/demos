require 'devcal'

addr = 'devcal.fly.dev:50051'
api_key = ENV['DEVCAL_API_KEY']

DEVCAL = Devcal.new_with_credentials(addr, api_key)
