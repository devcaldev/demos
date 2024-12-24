class EventsController < ApplicationController
  before_action :set_event, only: %i[ show edit update destroy ]

  # GET /events
  def index
    list_params = {Props: {"user_id" => Current.user.id}}
    list_params[:Props].update(params[:props]) if params[:props]
    list_params[:Range] = {Date: params[:date], Period: params[:period]} if params[:date] && params[:period]
    @events = Event.where(list_params)
  end

  # GET /events/1
  def show
  end

  # GET /events/new
  def new
    @event = Event.new(user_id: Current.user.id)
  end

  # GET /events/1/edit
  def edit
  end

  # POST /events
  def create
    @event = Event.new(event_params.merge(user_id: Current.user.id))

    if @event.save
      redirect_to @event, notice: "Event was successfully created."
    else
      render :new, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /events/1
  def update
    @event.assign_attributes(event_params)
    if @event.save
      redirect_to @event, notice: "Event was successfully updated.", status: :see_other
    else
      render :edit, status: :unprocessable_entity
    end
  end

  # DELETE /events/1
  def destroy
    @event.destroy!
    redirect_to events_path, notice: "Event was successfully destroyed.", status: :see_other
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_event
      @event = Event.find(params.expect(:id))
    end

    # Only allow a list of trusted parameters through.
    def event_params
      params.fetch(:event, {}).permit(:dtstart, :dtend, :rrule, :props)
    end
end
